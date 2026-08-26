from app.auth.password_handler import hash_password, verify_password

password = "Password@123"

hashed = hash_password(password)

print("Hashed Password:")
print(hashed)

print("\nVerification Result:")
print(verify_password(password, hashed))