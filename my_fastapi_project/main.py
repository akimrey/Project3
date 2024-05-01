from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

@app.get("/api/v1/hello")
def read_root():
    return {"Hello": "World"}

app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")
