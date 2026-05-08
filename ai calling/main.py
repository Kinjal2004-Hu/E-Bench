import asyncio
import traceback
import time
import jwt
from videosdk.agents import (
    Agent,
    AgentSession,
    Pipeline,
    JobContext,
    RoomOptions,
    WorkerJob,
    Options,
)
from videosdk.plugins.google import GeminiRealtime, GeminiLiveConfig
from dotenv import load_dotenv
import os
import logging

logging.basicConfig(level=logging.INFO)
load_dotenv()


def generate_videosdk_token() -> str:
    api_key = os.getenv("VIDEOSDK_API_KEY")
    secret = os.getenv("VIDEOSDK_SECRET")

    if not api_key or not secret:
        raise ValueError("VIDEOSDK_API_KEY or VIDEOSDK_SECRET missing in .env!")

    payload = {
        "apikey": api_key,
        "permissions": ["allow_join", "allow_mod"],
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24 hours
    }

    token = jwt.encode(payload, secret, algorithm="HS256")
    return token if isinstance(token, str) else token.decode("utf-8")


class MyVoiceAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="You are a helpful AI assistant that answers phone calls. Keep your responses concise and friendly.",
        )

    async def on_enter(self) -> None:
        await self.session.say("Hello! I'm your real-time assistant. How can I help you today?")

    async def on_exit(self) -> None:
        await self.session.say("Goodbye! It was great talking with you!")


async def start_session(context: JobContext):
    model = GeminiRealtime(
        model="gemini-2.0-flash-live-001",
        api_key=os.getenv("GOOGLE_API_KEY"),
        config=GeminiLiveConfig(
            voice="Leda",
            response_modalities=["AUDIO"]
        )
    )

    pipeline = Pipeline(llm=model)

    session = AgentSession(
        agent=MyVoiceAgent(),
        pipeline=pipeline,
    )

    await session.start(wait_for_participant=True, run_until_shutdown=True)


def make_context() -> JobContext:
    # RoomOptions without auth_token - it will be generated from Options.auth_token
    return JobContext(room_options=RoomOptions())


if __name__ == "__main__":
    try:
        # Set environment for videosdk
        os.environ["VIDEOSDK_API_KEY"] = os.getenv("VIDEOSDK_API_KEY")
        os.environ["VIDEOSDK_SECRET_KEY"] = os.getenv("VIDEOSDK_SECRET")
        
        auth_token = generate_videosdk_token()
        print(f"✅ Token generated successfully (length: {len(auth_token)})")

        options = Options(
            agent_id="MyTelephonyAgent",
            register=True,
            max_processes=1,
            host="localhost",
            port=8081,
            auth_token=auth_token,
        )

        job = WorkerJob(entrypoint=start_session, jobctx=make_context, options=options)
        job.start()

    except Exception as e:
        traceback.print_exc()