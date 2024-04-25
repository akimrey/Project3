Project 3 -- Scaffold a MVC Application
Let's build an application from scratch! There are several goals with this project.

Learn how to set up and structure a Model-View-Controller Application
Review the various technologies we have leveraged this semester
Prepare you for building a web application for your Capstone Project
Your app can do anything you'd like, but it has to support all of the CRUD operations on at least one database table. If you can't think of an application, then make a list to track todo lists.

Overview
We'll do the following, roughly in order.

Set up a repository on Github
Set up the backend infrastructure (Python, Poetry, Fast API)
Set up the front-end infrastructure (React, Ant)
Set up the developer infrastructure (Docker, Docker Compose)
Set up the Database (Postgres)
Set up our Model-View-Controller Infrastructure
Create your application
Each of these steps require at least one commit. The last step will likely require multiple commits.

Set up a Github Repository
You know what to do. Make a project called Project 3. Your first commit should contain a readme file with a short description of what you intend for your application to do.

Set up the Backend
We'll set this up directly in Python, not via Docker. You should have Python installed in WSL, Linux, or Mac. You can confirm this by typing

$ python --version
If that doesn't work, try

$ python3 --version
Once you've got that set up, you should be able to install poetry globally via pip and you should be good to go.

$ pip install poetry
Create a new Poetry project. To start, you'll include FastAPI and uvicorn as dependencies. You'll also want to make sure you can get a basic server up and running. The "First Steps" guide for Fast API should walk you through this.

We'll eventually want the route root to return our UI. The example given in the FastAPI docs returns a JSON object. Let's fix this my moving the route root to an API route (e.g. "/api/v1/hello") instead of the root route. In the next section, we'll set up the route root so it returns the UI.

Write a (very) short curl script that does a request that issues an http request against your root route. While you're at it, add black, isort and flake8 as dev dependencies and write a check script.

Now is probably a good time to make a commit and request a review, if you haven't done that already.

Set up the Front-End
Create a directory called "ui". This is where we'll put all of our front-end work.

Go ahead and review Lab 6. Start by initializing a Node.js project in the UI directory. We'll scaffold a full react application (with an index.html, a styles.css and a main.jsx) as we did previously.

Let's also go ahead and create a check script for our javascript files.

Connecting to the Backend
Now we need our Fast API server to serve up the files for our front-end. To do that, we'll first need to add a new npm script to build our UI.

    "build": "vite build",

Now when we run

$ npm run build
we should see a new directory called dist in our UI directory. Let's first add that directory to our .gitignore file so we don't commit it (as a general rule, we don't commit build artifacts to version control).

As for integrating with our Fast API server, it's pretty straight-forward. First, import static files:

from fastapi.staticfiles import StaticFiles
and then add this line to the end of your Fast API server:

app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")
By adding this line to the end of all of our routes, we are saying "if no previous routes matched, then return the file inside the ui/dist directory if it exists."

Now when you run your Fast API server, you should see your UI served up as the route root!

Hot Reloading?
Now make a change to your front-end. Notice how our hot-reloading feature that Vite supports is no longer working. :(

Unfortunately, I haven't figured out how to get all the way to supporting hot-reloading, but we can support the next best thing, which is to rebuild the dist directory whenever a file changes.

Let's change our npm dev script to the following:

    "dev": "vite build --watch",

Now we can run this script, along with running our Fast API server, and when we make a change to the UI we can simply reload the browser (CTRL/CMD-R) and see the associated changes.

It's probably a good time to commit and get a PR reviewed if you haven't already. If you can figure out how to make hot-reloading work with our setup, that will almost certainly exceed expectations on this project.

Set up a Better Developer Environment
Having to have two commands constantly running in two separate terminals is kind of a pain, right? We'll improve our developer environment so that developers only have to type a single command to get everything up and running:

$ docker compose up
It will be a bit of a journey to get there, but we will by the end of this section!

Dockerfile
Start by reviewing the first part of Lab 5. We'll want to start by creating a Dockerfile in the root directory of our project. Our dockerfile will need to do a few things.

Start with a python:latest image.
Copy the contents of the project directory to /app on the container
Install poetry and the project's dependencies
Make the entrypoint our uvicorn command to launch the server
Your uvicorn command will need an additional parameter, --host "0.0.0.0"
Note that this doesn't actually build the UI (we'll take care of that in a second), so before you actually build the image you'll need to make sure you've run the npm build script at least once.

Once you're ready, build the image and tag it with project3:latest. Then run it as described in Lab 4. Note that you'll want to forward port 8000 on the container to 8000 on the host, and you'll want to share your local project directory with the /app directory on the container. All this is described in Lab 4.

Confirm everything is working by editing your server code (probably your api's hello route) and make sure the server is reloading upon the change. Since we're not currently running the UI dev script on the container, we won't see our UI changes (yet!).

Compose!
Now we're going to use Docker compose to run two containers at the same time! The first container will be based on the image we just created above, and the second one will keep watch over our UI for changes.

The easiest way to get started is to create a simple compose.yaml file that runs our server with all of those additional command-line paramters that we use when we run docker run.

services:
server:
build:
context: .
ports: - "8000:8000"
volumes: - ./app
Now when we run docker compose up as above, we'll see our container running as before! This is much easier than the docker run command we had to use to forward the port and share the directory, because now all of that information is in the configuration file. But it gets even better!

Let's add a second service called ui that runs our dev script.

ui:
image: node:lts
volumes: - ./ui:/ui - /ui/node_modules
working_dir: /ui
entrypoint: bash -c "npm ci && npm run dev"
Now let's delete our dist directory on our host machine so we can start fresh.

Ideally, this would be all that's required. Spoiler alert: it's not. Go ahead and run it and let's look at the output.

When I run it, I see a lot of errors, but this is the most interesting.

server-1 | RuntimeError: Directory 'ui/dist' does not exist
The issue here is a race condition. The server can't start until the UI is built, and compose is trying to start both containers at the same time.

We need to tell compose that we want the server to wait until the ui is built to make it work. That's not too hard. Modify your compose file so it looks like this.

services:
server:
build:
context: .
ports: - "8000:8000"
volumes: - .:/app
depends_on:
ui:
condition: service_healthy

ui:
image: node:lts
volumes: - ./ui:/ui - /ui/node_modules
working_dir: /ui
healthcheck:
test: "ls dist"
timeout: 60s
interval: 10s
entrypoint: bash -c "npm ci && npm run dev"
Note that we've added the depends_on entry to the server section, and the healthcheck entry to the ui section. The latter tells compose how to determine if the ui container is healthy (i.e. when ls dist lists the contents of the directory without error), and the former tells compose not to start serveruntilui` is healthy.

Go ahead and run docker compose up and try modifying the server code. Make sure the server reloads. Now change the UI, and confirm that the UI is being rebuilt. Note you'll still have to reload the page for either server or client changes.

This is probably a good commit/PR point, so go ahead and do that.

Set up the Database
Now we'd like to have an instance of postgres running. Note that this will be a separate container from our ui and server containers. Typically, we could just run a postgres container directly like this.

$ docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
This sets up the password for the databse to be postgres and forwards the container postgres port (5432) to the same port on the host (you may need to modify this if the port has a conflict).

This works fine, but wouldn't it be great to just run this as part of the docker compose up command, along with our UI and server? Well, you can!

To bootstrap things, let's go ahead and set up a container with our dvdrental database set up. Create a new directory in your project called db and copy the Dockerfile and init.sh script from activity 4 to the new directory.

Now let's add the following entry to our docker compose services:

db:
build:
context: db
environment: - POSTGRES_PASSWORD=postgres
healthcheck:
test: "psql -U postgres -h localhost -p 5432"
timeout: 60s
interval: 10s
This tells docker compose to use the Dockerfile in the db directory to build our container image, and to test to make sure we can make connections to the db before we consider it "healthy."

One thing left to do: make it so your server container doesn't start until the db container is healthy. To do this, we do the same thing we did for the ui containers. Go ahead and do that.

Once we're good, let's run docker compose down and docker compose up again. We can see that our database server is there by running docker exec as in Activity 3.

$ docker exec -it project3-db-1 bash
Let's confirm the dvdrental database is there as we did before. Now let's try to connect to it from our application.

This is a good place to commit and set up a PR.

Accessing a Model in a Controller
Before we do anything, we'll need to add some Python libraries (via Poetry, of course) to the docker image for our server. We'll need to add both sqlalchemy with the asyncio extras, and we'll also need to add asyncpg. I don't think we've added a poetry dependency with extras before, so here's how you can do that:

$ poetry add "sqlalchemy[asyncio]"
Installing the asyncpg dependency should be second nature by now. :)

Remember that since you're installing poetry dependencies as part of the build process, you'll need to tell docker compose to rebuild the image next time you launch it to get the new dependencies.

$ docker compose up --build
Once our dependencies are squared away, we'll copy some code from orm.py in Activity 4 into a file called models.py file.

from sqlalchemy.ext.automap import automap_base
from sqlalchemy.schema import MetaData

class AutoModels:
def **init**(self, engine):
self.\_base = None
self.\_engine = engine

    async def get(self, table_name: str):
        if not self._base:
            await AutoModels._async_init()
        return getattr(self._base.classes, table_name, None)

    async def _async_init(self):
        async with self._engine.connect() as conn:
            metadata = MetaData()
            await conn.run_sync(metadata.reflect)
            self._base = automap_base(metadata=metadata)
            self._base.prepare()

    @staticmethod
    async def create(engine):
        instance = AutoModels(engine)
        await instance._async_init()
        return instance

This is simply our AutoModels class from orm.py. Now we need to initialize it in our FastAPI app. Since initializing these models requires a call to the database, it's relatively expensive, so we should do it before the application starts.

FastAPI has a notion of "lifespan" events that allow you to run things before the server starts and before it shuts down. Here's a modified FastAPI server that does what we want and sets up a new route that returns data from the film table.

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
    return results

app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")
Test this out and make sure the route is returning data from the database as you'd expect. If it is, let's go ahead and commit it.

Creating an Index
Now that all the pieces of your app are working, let's create a React view that returns data from the server-side films API. In our main.jsx file, we can create a simple React component to display the data. It might look something like this.

function FilmEntry({ id, title, description }) {
return (
<p>
<a href={`/film/${id}`}>{title}</a>: {description}
</p>
);
}
Notice that this React component produces a link that will not work yet. The goal is that this will eventually take us to the "Film" view. We will get to that in a moment.

Now, in our main file, we'll fetch the data from the API and create a list of those components from the list of retrieved data using the Map function that Sarah explained in class. Our main function might look something like this.

async function main() {
const filmsResponse = await fetch("/api/v1/films");
const films = await filmsResponse.json();

const rootElt = document.getElementById("app");
const root = createRoot(rootElt);
root.render(
films.map((film) => (
<ul>
<li>
<FilmEntry
            id={film.id}
            title={film.title}
            description={film.description}
          />
</li>
</ul>
)),
);
}
Let's make sure that your index is showing up (and, yes, the links will not work). Once it is, let's commit, make a PR, and move on to the next section.

Creating a Film View
Scaffolding The UI
Let's make those links work! First, we're going to create a new "film" view which you can think of as a new HTML file. The easiest way to do this is to copy the existing index.html file to a file called film.html and the existing main.jsx file to a file called film.jsx.

Then we'll edit it so that the film.html file is loading the film.jsx script. You can also modify the film.jsx component so that it just shows something like "This is the Film View" instead of having it behave the same as main.jsx. That will help us make sure things are working correctly.

Next, we need to tell vite about the new view so it builds it. Until now, we haven't needed a vite config file since it uses index.html as the entry point by default. Creating a config that specifies both isn't too hard. Just create a file called vite.config.js in your ui directory, and populate it like this.

const { defineConfig } = require("vite");

module.exports = defineConfig({
build: {
rollupOptions: {
input: {
main: "./index.html",
film: "./film.html",
},
},
},
});
You may need to restart your ui container to get this to take effect.

$ docker compose restart ui
Once that happens, you should see film.html inside the dist directory in ui.

Creating the Controller
In server.py we'll create a new route (controller) to deliver the view. First, we'll need to import Fast API's HTMLResponse library.

from fastapi.responses import HTMLResponse
Then we'll create the route.

@app.get("/film/{id}", response_class=HTMLResponse)
async def film(id: int):
with open("ui/dist/film.html") as file:
return file.read()
Notice how we've "templatized" the route, and the id is piped through to the function. This will become important in the next section.

Creating the API
Now we'll want to create the film API route that you'll call from JavaScript to get your data to populate the view. The function header is going to look similar to the route above, and the body will look similar to the films route we created earlier that returns all the film.

The difference is that we want to query the model and get back just the data associated with the provided id. Write the database query, and return /all/ the information associated with the film, although we can leave out the data for joined tables for the time being.

Updating the View
Now let's build out the UI where we show all the information associated with the film. To do this, you'll need to make an API call to the route you just created. To do this, you'll need to extract the ID from the route.

The path is stored in window.location.pathname. But it will be something like film/388 and you just need the 388 part. Chat GPT can probably suggest various approaches that can help you extract that.

Once you have the ID, you'll need to fetch the data. Then you can construct the view as a React component.

Once you get the view displaying all of the film data, add a link to take you back to the root list view so it's easy to jump around. This is a good place to commit and make a PR (with a screenshot of your UI!), so go ahead and do that.

Creating Your Own Data Models
This is the part where I was going to have you create your own data model. I spent quite a bit of time trying to figure out how to do that in a minimal, understandable way that would also scale up to a larger application. Ultimately, I decided that we just won't have time this semester. :(

That said, SQLAlchemy's ORM Quick Start shows you how to create your own models, so you are welcome to experiment with that if you'd like. And getting some of your own data models working will certainly "Exceed Expectations" for this project.

Unfortunately, that's not quite enough to build an application that's both flexible and maintainable. To do that, you'll also need a tool to manage database migrations (which basically means changes to your database schemas). Alembic, which was created by the same folks who created SQLAlchemy, is a great tool for doing that. But, of course, it has its own learning curve.

One new tool that is on the horizon is SQLModel, written by the same person who wrote Fast API. I played around with it a bit this weekend, and it's excellent although a little rough around the edges.

The value with SQLModel is that it abstracts both SQLAlchemy and Pydantic. This roughly means that you can create a single model that can be used both to represent your database table and use the same one as a Python type which can be used as a FastAPI type.

Going forward, I think a good stack would be to use SQLModel to build your database models and Python types, and then Alembic to handle your migrations. If you're going to use the Python/JavaScript stack for your capstone project, this might be a good approach.

CRUD Operations
Since we're not building our own data models, we'll use the generated models for the dvdrental database. We've seen how we can create an API endpoint for the view that reads content from the database. But how do we change it?

Most data models support the basic CRUD (Create, Read, Update, Delete) operations. Those map fairly nicely to HTTP verbs (Post, Get, Put/Patch, Delete), and that mapping is a crucial component of a REST application architecture. So how do we do we implement some of these other CRUD operations via HTTP verbs?

Create an API for Delete
Let's start with the easiest one: Delete. Let's suppose we want to delete a film from our film table. We can start by setting up a delete API call on our film route with a specific id.

Inside that controller, we'll want to first fetch the object from the database (to confirm it's there) and then delete it. The code to delete the object is on the session, and we'll need to commit the session after the deletion.

@app.delete("/api/v1/film/{id}")
async def api_v1_film_delete(id: int):
Film = await auto_models.get("film")

    async with AsyncSession(engine) as session:
        # TODO: fetch the film from the database here
        if film:
            await session.delete(film)
            await session.commit()
            return {"ok": True}
        else:
            return {"ok": False, "reason": "not found"}

Great, now how can we tell if it works? The easiest way is to use curl. By default, curl calls the GET HTTP verb.

$ curl localhost:8000/api/v1/film/99
{"title":"Bringing Hysterical","description":"A Fateful Saga of a A Shark And a Technical Writer who must Find a Woman in A Jet Boat","id":99}
But we can force it to use the DELETE HTTP verb with the -X argument.

$ curl -X DELETE localhost:8000/api/v1/film/99
{"ok":true}
We can confirm that worked by trying to delete it again.

$ curl -X DELETE localhost:8000/api/v1/film/99
{"ok":false,"reason":"not found"}
Wire it Up to the View
Now we'll wire it up to our view by adding a delete button. You can review our previous Poker labs to refresh your memory on how to add a button in React.

When the button is clicked, we'll want to do an fetch, but use the HTTP "DELETE" verb instead of the default "GET", just like we did with curl. It turns out that's fairly easy, and you can ask Chat GPT for an example to get you started.

Once you have delete working, let's make a commit and a PR.

Other CRUD Operations
At this stage, you have "met expectations" for the project. If you'd like to work on it some more, feel free to continue.

Once we have delete working, the goal is to get the other two CRUD operations working: Create (POST) and Update (PATCH) or Update (PUT).

To do this, you'll need to set up a route that presents a form to the user that can be used to create a DVD.

Getting either Create or Update working will result in an Exceeds Expectations for the project.
