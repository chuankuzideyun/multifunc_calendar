import contextvars

# ContextVar to store request-scoped user ID
current_user_id = contextvars.ContextVar("current_user_id", default="default_user")
