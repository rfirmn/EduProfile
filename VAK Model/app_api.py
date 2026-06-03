
import os
# WAJIB DI PALING ATAS: Memaksa penggunaan Keras 2 (Legacy) agar kompatibel dengan Hugging Face
os.environ["TF_USE_LEGACY_KERAS"] = "1"

import tensorflow as tf
import tf_keras as keras
from tf_keras.models import load_model
from tf_keras.layers import Layer
from sklearn.preprocessing import MinMaxScaler

import torch
import numpy as np
from transformers import AutoTokenizer, BertModel
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict

# PATCH: tf_keras menggunakan tf.io.gfile.join yang menghasilkan backslash (\) di Windows.
# HDF5 memerlukan forward slash (/) untuk path group. Kita lakukan patch pada H5IOStore.get.
import tf_keras.src.saving.saving_lib as saving_lib
orig_get = saving_lib.H5IOStore.get
def patched_get(self, path):
    if path:
        path = path.replace('\\', '/')
    return orig_get(self, path)
saving_lib.H5IOStore.get = patched_get

# Definisi CustomDense layer agar Keras tahu cara merakit kembali layer buatanmu
class CustomDense(Layer):
    def __init__(self, units, activation=None, **kwargs):
        super(CustomDense, self).__init__(**kwargs)
        self.units = units
        self.activation = keras.activations.get(activation)

    def build(self, input_shape):
        input_dim = input_shape[-1]
        self.w = self.add_weight(
            shape=(input_dim, self.units),
            initializer="glorot_uniform",
            trainable=True,
            name="custom_weight"
        )
        self.b = self.add_weight(
            shape=(self.units,),
            initializer="zeros",
            trainable=True,
            name="custom_bias"
        )
        super(CustomDense, self).build(input_shape)

    def call(self, inputs):
        output = tf.matmul(inputs, self.w) + self.b
        if self.activation is not None:
            output = self.activation(output)
        return output

    def get_config(self):
        config = super(CustomDense, self).get_config()
        config.update({
            "units": self.units,
            "activation": keras.activations.serialize(self.activation)
        })
        return config

scaler = MinMaxScaler()
# Fit the scaler using the training data min and max bounds:
# Order: [EduTech, DeviceUsage, Resources, Discussions, CourseParticipation, EmotionEngagement, PhysicalActivity, Extracurricular]
min_vals = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0013462709565636999, 6.0, 0.0]
max_vals = [1.0, 29.0, 2.0, 1.0, 49.0, 0.9976228222513854, 4997.0, 1.0]
scaler.fit(np.array([min_vals, max_vals]))

# ----------------- LOAD MODELS -----------------

print("Loading BERT Tokenizer & Model...")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
MODEL_NAME = 'bert-base-uncased'
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
bert_model_pt = BertModel.from_pretrained(MODEL_NAME).to(device)

print("Loading EduProfile VAK Keras Model...")
model_path = os.path.join(os.path.dirname(__file__), 'eduprofile_multimodal_v1.keras')
keras_model = load_model(
    model_path, 
    custom_objects={'CustomDense': CustomDense},
    safe_mode=False
)

target_labels = {0: 'Auditory', 1: 'Kinesthetic', 2: 'Visual'}

def extract_single_text_feature(text_input):
    encoded = tokenizer(
        [text_input],
        padding='max_length',
        truncation=True,
        max_length=64,
        return_tensors='pt'
    )
    encoded = {k: v.to(device) for k, v in encoded.items()}
    with torch.no_grad():
        outputs = bert_model_pt(**encoded)
        pooled_feature = outputs.last_hidden_state.mean(dim=1).cpu().numpy()
    return pooled_feature

# ----------------- FASTAPI SETUP -----------------

app = FastAPI(
    title="EduProfile VAK Model API",
    description="API untuk memprediksi gaya belajar berdasarkan kalimat refleksi dan 8 indikator kebiasaan belajar.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VAKInput(BaseModel):
    text_reflection: str = Field(
        ..., 
        description="Kalimat refleksi situasi belajar yang nyaman bagi pengguna.",
        json_schema_extra={"example": "I prefer reading illustrated textbooks and watching video explanations."}
    )
    habit_features: List[float] = Field(
        ..., 
        min_length=8, 
        max_length=8,
        description="8 Nilai indikator perilaku (raw). Urutan: [EduTech, DeviceUsage, Resources, Discussions, CourseParticipation, EmotionEngagement, PhysicalActivity, Extracurricular]",
        json_schema_extra={"example": [0.8, 7.0, 1.0, 1.0, 25.0, 0.5, 1000.0, 0.0]}
    )

    @field_validator('habit_features')
    @classmethod
    def normalize_habit_features(cls, v: List[float]) -> List[float]:
        # Normalisasi input habit menggunakan MinMaxScaler yang sudah di-fit
        v_arr = np.array(v, dtype=np.float32).reshape(1, -1)
        scaled_arr = scaler.transform(v_arr)[0]
        # Clip untuk memastikan nilai tetap berada di rentang [0.0, 1.0]
        scaled_arr = np.clip(scaled_arr, 0.0, 1.0)
        return scaled_arr.tolist()

class VAKOutput(BaseModel):
    predicted_style: str = Field(..., description="Gaya belajar yang diprediksi (Visual, Auditory, atau Kinesthetic)")
    confidence: float = Field(..., description="Tingkat keyakinan model dalam persen (%)")
    probabilities: Dict[str, float] = Field(..., description="Detail nilai probabilitas untuk masing-masing gaya belajar")

@app.post("/predict", response_model=VAKOutput)
def predict(data: VAKInput):
    try:
        # Ekstraksi fitur NLP menggunakan BERT
        nlp_input = extract_single_text_feature(data.text_reflection)
        habit_input = np.array(data.habit_features, dtype=np.float32).reshape(1, -1)
        
        # Prediksi menggunakan Keras Model
        prediction_proba = keras_model.predict(x=[nlp_input, habit_input], verbose=0)
        
        # Ekstraksi hasil
        predicted_class_idx = np.argmax(prediction_proba, axis=1)[0]
        predicted_label = target_labels[predicted_class_idx]
        confidence = float(prediction_proba[0][predicted_class_idx] * 100)
        
        probabilities = {
            'Auditory': float(prediction_proba[0][0] * 100),
            'Kinesthetic': float(prediction_proba[0][1] * 100),
            'Visual': float(prediction_proba[0][2] * 100)
        }
        
        return VAKOutput(
            predicted_style=predicted_label,
            confidence=round(confidence, 2),
            probabilities={k: round(v, 2) for k, v in probabilities.items()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan inferensi model: {str(e)}")

@app.get("/", response_class=HTMLResponse)
def read_root():
    html_path = os.path.join(os.path.dirname(__file__), 'index.html')
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>index.html not found</h1>", status_code=404)
