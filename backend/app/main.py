# ─── ADD THIS IMPORT (at top, with other imports) ───
from app.routers.tracking import router as tracking_router

# ─── ADD THIS LINE (where other routers are registered) ───
app.include_router(tracking_router)
