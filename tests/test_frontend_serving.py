import asyncio
from pathlib import Path

from backend.app import Settings, create_app


def test_quart_serves_vite_assets(tmp_path):
    dist = tmp_path / "frontend" / "dist"
    dist.mkdir(parents=True)
    (dist / "index.html").write_text("<div id='root'></div>", encoding="utf-8")
    (dist / "assets").mkdir()
    (dist / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")
    app = create_app(Settings(tmp_path))

    async def check():
        client = app.test_client()
        response = await client.get("/assets/app.js")
        assert response.status_code == 200
        assert "console.log" in await response.get_data(as_text=True)
        missing = await client.get("/assets/missing.js")
        assert missing.status_code == 404

    asyncio.run(check())
