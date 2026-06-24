"""
Compatibility patches for modern Python / library versions.

Applied once at import time via app/__init__.py.
"""

import sys
import typing


# ── Python 3.14+ typing._eval_type patch for Pydantic compatibility ──────────
_orig_eval_type = getattr(typing, "_eval_type", None)
if _orig_eval_type:
    def _patched_eval_type(t, globalns, localns, *args, **kwargs):
        kwargs.pop("prefer_fwd_module", None)
        return _orig_eval_type(t, globalns, localns, *args, **kwargs)
    typing._eval_type = _patched_eval_type


# ── bcrypt >= 4.x compatibility patch for passlib ────────────────────────────
# Prevents AttributeError on bcrypt.__about__ and handles the 72-byte password
# limit transparently so passlib's wrap-detection test can pass.
try:
    import bcrypt

    class _MockAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")

    bcrypt.__about__ = _MockAbout()
    sys.modules["bcrypt.__about__"] = _MockAbout()  # type: ignore[assignment]

    _orig_hashpw = bcrypt.hashpw
    _orig_checkpw = bcrypt.checkpw

    def _truncate(password: bytes | str, limit: int = 72) -> bytes:
        if isinstance(password, str):
            password = password.encode("utf-8")
        return password[:limit] if len(password) > limit else password

    def _patched_hashpw(password, salt):  # type: ignore[misc]
        return _orig_hashpw(_truncate(password), salt)

    def _patched_checkpw(password, hashed_password):  # type: ignore[misc]
        return _orig_checkpw(_truncate(password), hashed_password)

    bcrypt.hashpw = _patched_hashpw  # type: ignore[assignment]
    bcrypt.checkpw = _patched_checkpw  # type: ignore[assignment]

except ImportError:
    pass
