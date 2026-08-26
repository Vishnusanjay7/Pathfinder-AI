from sqlalchemy import text

from app.database.database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        print(result.scalar())

    print("Database Connected Successfully!")

except Exception as e:
    print(e)