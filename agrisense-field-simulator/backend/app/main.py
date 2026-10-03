from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.api import routes_simulation, routes_scenarios, routes_esp32, routes_system, routes_serial
from app.state_store import app_state
from app.simulation.engine import step_simulation
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AGRI-SENSE Field Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_simulation.router)
app.include_router(routes_scenarios.router)
app.include_router(routes_esp32.router)
app.include_router(routes_system.router)
app.include_router(routes_serial.router)

background_task = None

async def live_simulation_loop():
    while True:
        if app_state.mode == "LIVE":
            step_simulation(app_state)
        await asyncio.sleep(app_state.interval_ms / 1000.0)

@app.on_event("startup")
async def startup_event():
    global background_task
    background_task = asyncio.create_task(live_simulation_loop())

@app.on_event("shutdown")
async def shutdown_event():
    if background_task:
        background_task.cancel()
