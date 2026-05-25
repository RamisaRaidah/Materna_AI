from flask import Flask
from flask_cors import CORS
from config import SECRET_KEY

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app)

from routes.chat import chat_bp
app.register_blueprint(chat_bp, url_prefix="/api/chat")

@app.route("/")
def home():
    return {"status": "App is running"}

@app.route("/api/health")
def health():
    return {"status": "MaternaAI backend is running"}

if __name__ == "__main__":
    app.run(debug=True)