from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.future import select

from models import AutoModels

engine = create_async_engine(
    "postgresql+asyncpg://postgres:postgres@db:5432/dvdrental", echo=True
)


auto_models = None


async def lifespan(app):
    print("startup")
    global auto_models
    auto_models = await AutoModels.create(engine)
    yield
    print("shutdown")


app = FastAPI(lifespan=lifespan)


@app.get("/api/v1/hello")
async def root():
    return {"message": "Hello World"}


@app.get("/api/v1/films")
async def films():
    Film = await auto_models.get("film")

    results = []

    async with AsyncSession(engine) as session:
        films = await session.execute(select(Film))
        for film in films.scalars().all():
            results.append(
                {
                    "title": film.title,
                    "description": film.description,
                    "id": film.film_id,
                }
            )
    return results


app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")