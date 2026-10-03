from app.simulation.state import create_initial_state

app_state = create_initial_state()

def reset_state():
    global app_state
    old_config = app_state.communication.config
    app_state = create_initial_state()
    app_state.communication.config = old_config
