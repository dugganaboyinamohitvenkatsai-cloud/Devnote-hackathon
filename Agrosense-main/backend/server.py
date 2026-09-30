import os
from pathlib import Path

from fastapi import APIRouter, FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from routers.agro import router as agro_router

app = FastAPI(title="AgroSense AI", version="0.1.0-demo")
api_router = APIRouter(prefix="/api")
api_router.include_router(agro_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Keep this as the final statement: every route is folded into /api before mounting.
app.include_router(api_router)
