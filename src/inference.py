import torch
import requests
import os
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
from src.model import create_model



load_dotenv()


def safe_log(x):
    return np.log10(x + 1) if x > 0 else 0.0


class BotDetector:
    """Real-time bot detection using Bright Data API"""


    def __init__(self, model_path="models/bot_detector_mlp.pt"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


        print("Loading trained model...")
        self.model = create_model(input_dim=23).to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
        self.model.eval()
        print(f"✓ Model loaded from {model_path}")


        scaler = torch.load('data/scaler.pt')
        self.feature_mean = scaler['feature_mean']
        self.feature_std = scaler['feature_std']
        print("✓ Feature normalization parameters loaded.")


        self.bright_data_api_token = os.getenv('BRIGHT_DATA_API_TOKEN', '')
        self.dataset_id = os.getenv('BRIGHT_DATA_DATASET_ID', '')


        if not self.bright_data_api_token or not self.dataset_id:
            print("⚠ Warning: BRIGHT_DATA credentials not found in .env file")
            print("  Add: BRIGHT_DATA_API_TOKEN and BRIGHT_DATA_DATASET_ID")


    def extract_features_from_brightdata(self, username):
        """Extract Twitter user features using Bright Data Web Scraper API"""
        print(f"\nExtracting features for user: @{username}")


        if not self.bright_data_api_token or not self.dataset_id:
            print("⚠ Using dummy features (add credentials to .env for real data)")
            return self._create_dummy_features()


        try:
            url = "https://api.brightdata.com/datasets/v3/scrape"
            headers = {
                "Authorization": f"Bearer {self.bright_data_api_token}",
                "Content-Type": "application/json"
            }
            params = {
                "dataset_id": self.dataset_id,
                "notify": "false",
                "include_errors": "true",
                "type": "discover_new",
                "discover_by": "user_name"
            }
            payload = {
                "user_name": username
            }
            print("📡 Calling Bright Data API...")
            response = requests.post(url, headers=headers, params=params, json=payload, timeout=90)


            print(f"Status Code: {response.status_code}")


            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    profile_data = result[0]
                elif isinstance(result, dict):
                    if 'profile_name' in result or 'x_id' in result:
                        profile_data = result
                    elif 'data' in result:
                        profile_data = result['data']
                    elif 'snapshot_id' in result:
                        print(f"⚠ Async response - snapshot_id: {result['snapshot_id']}")
                        return self._create_dummy_features()
                    else:
                        print(f"Unexpected response format")
                        return self._create_dummy_features()
                else:
                    print(f"Unexpected response type: {type(result)}")
                    return self._create_dummy_features()


                print(f"✓ Got live data for: @{profile_data.get('id', 'unknown')}")
                features = self._map_brightdata_to_features(profile_data)
                print("✓ Features extracted successfully from Bright Data!")
                return features


            else:
                print(f"✗ API error: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                if response.status_code == 401:
                    print("\n💡 Authentication failed. Check your credentials in .env")
                elif response.status_code == 400:
                    print("\n💡 Validation error. Check API parameters")
                return self._create_dummy_features()


        except Exception as e:
            print(f"✗ Error: {e}")
            return self._create_dummy_features()


    def _map_brightdata_to_features(self, data):
        """Map Bright Data response to 23-feature tensor using log-scaling for numeric features and scaled account age"""
        followers_val = data.get('followers', 0) or 0
        following_val = data.get('following', 0) or 0
        posts_val = data.get('posts_count', 0) or 0
        subscriptions_val = data.get('subscriptions', 0) or 0


        followers = safe_log(followers_val)
        following = safe_log(following_val)
        posts_count = safe_log(posts_val)
        is_verified = 1 if data.get('is_verified', False) else 0


        # Account age: do NOT log-transform, but scale by 10000 to match training expectations
        date_joined = data.get('date_joined', '')
        if date_joined:
            try:
                join_date = datetime.fromisoformat(date_joined.replace('Z', '+00:00'))
                account_age = (datetime.now(join_date.tzinfo) - join_date).days
            except:
                account_age = 365
        else:
            account_age = 365
        account_age_scaled = account_age / 10000.0   # <---- scaling


        subscriptions = safe_log(subscriptions_val)
        biography = data.get('biography') or ''
        profile_name = data.get('profile_name') or ''
        location = data.get('location') or ''
        external_link = data.get('external_link') or ''


        description_length = safe_log(len(biography))
        screen_name_length = safe_log(len(profile_name))
        has_url = 1 if external_link else 0
        geo_enabled = 1 if location else 0


        features_raw = [
            followers, following, posts_count, float(is_verified), float(account_age_scaled),
            subscriptions, description_length, screen_name_length,
            float(has_url), float(geo_enabled), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ]


        # Derived metrics: ratios, log-transformed
        follower_ratio = safe_log(followers_val / (following_val + 1e-6))
        following_ratio = safe_log(following_val / (followers_val + 1e-6))
        ratio_score = min(abs(np.log10((followers_val / (following_val + 1e-6)) + 1e-6)), 3.0)


        features_derived = [follower_ratio, following_ratio, ratio_score]
        all_features = features_raw + features_derived
        return torch.tensor(all_features, dtype=torch.float32)


    def _create_dummy_features(self):
        """Dummy features for local testing, using log-scaling and scaled account age"""
        followers_val = 150
        following_val = 2500
        posts_val = 8000
        subscriptions_val = 0
        is_verified = 0.0
        account_age = 45.0
        account_age_scaled = account_age / 10000.0 # <---- scaling


        description_length = safe_log(20)
        screen_name_length = safe_log(8)
        has_url = 1.0
        geo_enabled = 0.0


        followers = safe_log(followers_val)
        following = safe_log(following_val)
        posts_count = safe_log(posts_val)
        subscriptions = safe_log(subscriptions_val)


        features_raw = [
            followers, following, posts_count, is_verified, account_age_scaled,
            subscriptions, description_length, screen_name_length,
            has_url, geo_enabled,
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ]
        follower_ratio = safe_log(followers_val / (following_val + 1e-6))
        following_ratio = safe_log(following_val / (followers_val + 1e-6))
        ratio_score = min(abs(np.log10(followers_val / (following_val + 1e-6) + 1e-6)), 3.0)


        features_derived = [follower_ratio, following_ratio, ratio_score]
        all_features = features_raw + features_derived
        return torch.tensor(all_features, dtype=torch.float32)


    def predict(self, username):
        """Predict if user is bot or human"""
        features = self.extract_features_from_brightdata(username)
        print("\nExtracted features:", features.tolist())

        # Normalize features with training mean/std
        features = (features - self.feature_mean) / (self.feature_std + 1e-8)
        features = features.unsqueeze(0).to(self.device)

        print("\nDEBUG INFO")
        print("Normalized input features:", features[0].tolist())

        with torch.no_grad():
            logits = self.model(features)
            tpr = 100.0  #Change from 3.0 to 10.0
            probabilities = torch.softmax(logits / tpr, dim=1)
            print(f"🔥 After softmax: {probabilities.tolist()}")
            print(f"Argmax result: {torch.argmax(probabilities, dim=1).item()}")
            print("="*50 + "\n")

            prediction = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[0][prediction].item()
            human_prob = probabilities[0][0].item()
            bot_prob = probabilities[0][1].item()

        result = "🤖 BOT" if prediction == 1 else "👤 HUMAN"

        print(f"\n{'='*50}")
        print(f"PREDICTION: {result}")
        print(f"Confidence: {confidence*100:.2f}%")
        print(f"\nProbabilities:")
        print(f"  Human: {human_prob*100:.2f}%")
        print(f"  Bot:   {bot_prob*100:.2f}%")
        print(f"{'='*50}")

        return prediction, confidence, (human_prob, bot_prob)

if __name__ == "__main__":
    print("="*50)
    print("TWITTER BOT DETECTOR")
    print("="*50)


    detector = BotDetector()


    print("\n🧪 Testing bot detector...")
    test_username = input("Enter Twitter username (without @): ").strip() or "elonmusk"


    detector.predict(test_username)


    print("\n" + "="*50)
    print("✅ Bot detector ready!")
    print("="*50)
