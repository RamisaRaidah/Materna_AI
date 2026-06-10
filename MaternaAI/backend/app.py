from flask import Flask
from flask_cors import CORS
from config import SECRET_KEY, CORS_ORIGINS

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app, resources={
    r"/api/*": {"origins": CORS_ORIGINS},
    r"/auth/*": {"origins": CORS_ORIGINS},
})


# ─────────────────────────────────────────────
# Register Blueprints
# ─────────────────────────────────────────────
from routes.chat import chat_bp
app.register_blueprint(chat_bp, url_prefix="/api/chat")

from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix="/auth")

from routes.health import health_bp
app.register_blueprint(health_bp, url_prefix="/api/health")

from routes.risk import risk_bp
app.register_blueprint(risk_bp, url_prefix="/api/risk")

from routes.ppd import ppd_bp
app.register_blueprint(ppd_bp, url_prefix="/api/ppd")
 
from routes.community import community_bp
app.register_blueprint(community_bp, url_prefix="/api/community")

from routes.nutrition import nutrition_bp
app.register_blueprint(nutrition_bp, url_prefix="/api/nutrition")

from routes.clinician import clinician_bp
app.register_blueprint(clinician_bp, url_prefix="/api/clinician")

from routes.birth_plan import birth_plan_bp
app.register_blueprint(birth_plan_bp, url_prefix="/api/birth_plan")

from routes.sos import sos_bp
app.register_blueprint(sos_bp, url_prefix="/api/sos")

from routes.notifications import notifications_bp
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

from routes.admin import admin_bp
app.register_blueprint(admin_bp, url_prefix="/api/admin")

from routes.sms_routes import sms_bp
app.register_blueprint(sms_bp, url_prefix="/api/sms")

from routes.care_plan import care_plan_bp
app.register_blueprint(care_plan_bp, url_prefix="/api/care-plan")

print("All blueprints have been registered.")

@app.route("/")
def home():
    return {"status": "MaternaAI backend is running"}


@app.route("/api/health")
def health():
    return {"status": "MaternaAI backend is running", "version": "2.0"}


if __name__ == "__main__":
    app.run(debug=True)