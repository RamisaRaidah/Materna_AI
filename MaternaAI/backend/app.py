from flask import Flask
from flask_cors import CORS
from config import SECRET_KEY

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app)

from routes.chat import chat_bp
app.register_blueprint(chat_bp, url_prefix="/api/chat")

from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix="/auth")

from routes.health import health_bp
app.register_blueprint(health_bp, url_prefix="/api/health")

from routes.ppd import ppd_bp
app.register_blueprint(ppd_bp, url_prefix="/api/ppd")
 
@app.route("/")
def home():
    return {"status": "App is running"}

@app.route("/api/health")
def health():
    return {"status": "MaternaAI backend is running"}

if __name__ == "__main__":
    app.run(debug=True)