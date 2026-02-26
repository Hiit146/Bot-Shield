import torch
from src.model import create_model
import shap
import numpy as np

model = create_model(23)
model.eval()
features = torch.randn(1, 23)
background = torch.zeros(100, 23)
explainer = shap.DeepExplainer(model, background)
shap_values = explainer.shap_values(features)
print(type(shap_values))
if isinstance(shap_values, list):
    print(len(shap_values), shap_values[0].shape)
elif isinstance(shap_values, np.ndarray):
    print(shap_values.shape)
