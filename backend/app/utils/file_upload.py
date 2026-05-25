import os
from uuid import uuid4

from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_resume(file_storage, upload_dir: str) -> str:
    os.makedirs(upload_dir, exist_ok=True)

    original = secure_filename(file_storage.filename or "resume")
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else ""
    unique = f"{uuid4().hex}.{ext}" if ext else uuid4().hex

    path = os.path.join(upload_dir, unique)
    file_storage.save(path)
    return unique
