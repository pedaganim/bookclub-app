import os
import json
import tempfile
from typing import Any, Dict, List, Tuple

try:
    from paddleocr import PaddleOCR  # type: ignore
except Exception:
    PaddleOCR = None  # Defer import errors for local editing


def _init_ocr() -> Any:
    """Initialize a lightweight English-only PaddleOCR instance (lazy singleton)."""
    global _OCR
    try:
        _OCR
    except NameError:
        _OCR = None  # type: ignore
    if _OCR is None:
        if PaddleOCR is None:
            raise RuntimeError("PaddleOCR not available in runtime")
        _OCR = PaddleOCR(lang='en', use_angle_cls=True, show_log=False)  # type: ignore
    return _OCR


def _download_s3_object(bucket: str, key: str) -> str:
    import boto3  # Local import to minimize cold start path
    fd, path = tempfile.mkstemp(suffix=os.path.splitext(key)[1] or '.jpg')
    os.close(fd)
    s3 = boto3.client('s3')
    s3.download_file(bucket, key, path)
    return path


def _download_http(url: str) -> str:
    import requests  # type: ignore
    fd, path = tempfile.mkstemp(suffix='.jpg')
    os.close(fd)
    with requests.get(url, stream=True, timeout=15) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
    return path


def _bbox_area(bbox: List[List[float]]) -> float:
    # bbox as [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    return max(0.0, (max(xs) - min(xs))) * max(0.0, (max(ys) - min(ys)))


def _heuristic_candidates(ocr_result: Any) -> Tuple[List[Dict], List[Dict]]:
    # PaddleOCR returns: [ [ [bbox], (text, conf) ], ... ]
    lines: List[Tuple[str, float, float]] = []  # (text, conf, area)
    for item in ocr_result or []:
        try:
            bbox = item[0]
            text = item[1][0]
            conf = float(item[1][1])
            area = _bbox_area(bbox)
            if text and isinstance(text, str):
                lines.append((text.strip(), conf, area))
        except Exception:
            continue

    # Rank by confidence * area (simple proxy for salience)
    ranked = sorted(lines, key=lambda t: (t[1] * (1.0 + t[2] / 10000.0)), reverse=True)

    def _norm(s: str) -> str:
        return ' '.join(s.replace('\n', ' ').split())[:200]

    title_cands: List[Dict] = []
    author_cands: List[Dict] = []

    for text, conf, _ in ranked[:20]:
        t = _norm(text)
        if not t or len(t) < 3:
            continue
        # Heuristic: lines with commas/and often indicate authors; ALLCAPS/Title case for titles
        if any(x in t for x in [',', ' and ', ' & ']) and len(t) < 80:
            author_cands.append({"value": t, "confidence": round(conf, 3)})
        else:
            title_cands.append({"value": t, "confidence": round(conf, 3)})

    # Deduplicate while preserving order
    def _dedup(items: List[Dict]) -> List[Dict]:
        seen = set()
        out: List[Dict] = []
        for it in items:
            v = it.get("value", "").lower()
            if v and v not in seen:
                seen.add(v)
                out.append(it)
        return out[:5]

    return _dedup(title_cands), _dedup(author_cands)


def handler(event, _context):
    """Lambda entrypoint for OCR worker.

    Expected event: { "s3Bucket": str, "s3Key": str, "imageUrl": str }
    Returns: { title_candidates: [...], author_candidates: [...], language_guess: 'en' }
    """
    try:
        bucket = event.get('s3Bucket')
        key = event.get('s3Key')
        image_url = event.get('imageUrl')

        if not (bucket and key) and not image_url:
            raise ValueError("Missing image location: provide s3Bucket/s3Key or imageUrl")

        if bucket and key:
            path = _download_s3_object(bucket, key)
        else:
            path = _download_http(image_url)

        ocr = _init_ocr()
        result = ocr.ocr(path, cls=True)  # returns list per image
        lines = result[0] if isinstance(result, list) else []
        titles, authors = _heuristic_candidates(lines)

        return {
            "title_candidates": titles,
            "author_candidates": authors,
            "language_guess": "en",
        }
    except Exception as e:
        return {
            "error": str(e),
            "title_candidates": [],
            "author_candidates": [],
            "language_guess": "en",
        }
