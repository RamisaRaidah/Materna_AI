from flask import Flask
from flask_cors import CORS
from config import SECRET_KEY

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app)

# Register routes
from routes.chat import chat_bp
from routes.ppd import ppd_bp
from routes.nutrition import nutrition_bp
from routes.community import community_bp

app.register_blueprint(chat_bp, url_prefix="/api/chat")
app.register_blueprint(ppd_bp, url_prefix="/api/ppd")
app.register_blueprint(nutrition_bp, url_prefix="/api/nutrition")
app.register_blueprint(community_bp, url_prefix="/api/community")

@app.route("/api/health")
def health():
    return {"status": "MaternaAI backend is running"}

if __name__ == "__main__":
    app.run(debug=True)