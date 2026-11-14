"""Isolated audit probes. Execute original function bodies without starting DICE.

SQLModel/database dependencies are unavailable. AST extraction removes decorators,
type annotations, and dependency defaults only; business logic is unchanged.
The filesystem probe runs in an automatically removed temporary directory.
These are targeted reproductions, not an API or browser integration test suite.
"""
import ast
import os
from pathlib import Path
import re
import runpy
import sys
import tempfile
from types import SimpleNamespace as NS

from fastapi import HTTPException, status

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding="utf-8")


def extract(relative, name, namespace):
    tree = ast.parse((ROOT / relative).read_text(encoding="utf-8"))
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
    node.decorator_list = []
    node.returns = None
    for arg in node.args.args + node.args.kwonlyargs:
        arg.annotation = None
    node.args.defaults = []
    module = ast.fix_missing_locations(ast.Module(body=[node], type_ignores=[]))
    exec(compile(module, str(ROOT / relative), "exec"), namespace)
    return namespace[name]


def expect_http(call, code):
    try:
        call()
    except HTTPException as exc:
        assert exc.status_code == code, (exc.status_code, exc.detail)
        return exc.detail
    raise AssertionError(f"Expected HTTPException {code}")


base = runpy.run_path(str(ROOT / "backend/models/base.py"))
OrderStatus = base["OrderStatus"]
order_source = ast.parse((ROOT / "backend/api/routers/orders.py").read_text(encoding="utf-8"))
transitions = next(n for n in order_source.body if isinstance(n, ast.Assign)
                   and any(isinstance(t, ast.Name) and t.id == "VALID_TRANSITIONS" for t in n.targets))
ns = {"OrderStatus": OrderStatus, "HTTPException": HTTPException, "Order": object()}
exec(compile(ast.Module(body=[transitions], type_ignores=[]), "transitions", "exec"), ns)
extract("backend/api/routers/orders.py", "_is_authorized_for_order", ns)
update = extract("backend/api/routers/orders.py", "update_order", ns)
artist = NS(id=20, is_artist=True, is_admin=False)
for value in ["SKETCH", "LINEART", "FINAL_REVIEW"]:
    order = NS(id=1, client_id=30, artist_id=20, status=OrderStatus.ACCEPTED)
    session = NS(get=lambda *_: order)
    detail = expect_http(lambda: update(1, NS(status=value), None, session, artist), 400)
    print(f"REPRODUCED stage {value}: HTTP 400 ({detail})")
for current in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
    order = NS(id=1, client_id=30, artist_id=20, status=current)
    session = NS(get=lambda *_: order)
    detail = expect_http(lambda: update(1, NS(status="COLORING"), None, session, artist), 400)
    print(f"REPRODUCED {current.value} -> COLORING: HTTP 400 ({detail})")
ui = (ROOT / "frontend/src/app/[locale]/dashboard/admin/orders/page.tsx").read_text(encoding="utf-8")
dropdown = ui.split("{/* Status Switcher Dropdown */}")[1].split("</select>")[0]
options = re.findall(r'<option value="([A-Z_]+)"', dropdown)
missing = sorted({s.value for s in OrderStatus} - set(options))
assert missing == ["ACCEPTED", "SKETCHING"]
print(f"CONFIRMED dropdown missing backend stages: {missing}")

price_ns = {"AddonPriceType": NS(FIXED="FIXED", PERCENTAGE="PERCENTAGE")}
price = extract("backend/services/commission_service.py", "compute_total_price", price_ns)
service = NS(id=1, base_price=1000, form_schema=[{
    "type": "BACKGROUND_TIER", "enabled": True,
    "config": {"tiers": [{"label": "Full Scenic", "price": 1200}]},
}])
responses = {"background_tier": {"label": "Full Scenic", "price": 1200}}
total, _ = price(service, [], responses)
assert total == 1000
print(f"REPRODUCED background pricing: UI base 1000 + fee 1200 = 2200; server total = {total}")

schema_ns = runpy.run_path(str(ROOT / "backend/schemas/artist.py"))
profile_schema = schema_ns["ArtistProfileResponse"]
profile = profile_schema(id=1, handle="probe", display_name="Probe", artworks=[{"id": 7}],
                         auctions=[{"id": 8}], characters=[{"id": 9}])
absent = [k for k in ["artworks", "auctions", "characters"] if k not in profile.model_dump()]
assert len(absent) == 3
print(f"REPRODUCED profile response schema omits: {absent}")

order_schemas = runpy.run_path(str(ROOT / "backend/schemas/order.py"))
request = order_schemas["OrderCreateRequest"](
    title="Manual ticket", description="A manual client brief", artist_id=2, client_name="Alice"
)
assert "client_name" not in request.model_dump()
print("REPRODUCED manual ticket schema discards supplied client_name")


class FakeOrder:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        self.id = 1
        self.client = NS(full_name="Artist account")
    def model_dump(self):
        return {k: v for k, v in self.__dict__.items() if k != "client"}


profile_marker, user_marker = object(), object()
create_ns = {"Order": FakeOrder, "ArtistProfile": profile_marker, "User": user_marker,
             "OrderStatus": OrderStatus}
create = extract("backend/api/routers/orders.py", "create_order", create_ns)
manual_session = NS(
    get=lambda cls, _: NS(user_id=20) if cls is profile_marker else NS(full_name="Another artist"),
    add=lambda _: None, commit=lambda: None, refresh=lambda _: None,
)
created = create(request, manual_session, NS(id=2, full_name="Artist account"))
assert created["client_id"] == 2 and created["artist_id"] == 20
print("REPRODUCED manual ticket identity: actor user 2 becomes client; profile ID 2 collision routes artist to user 20")

class Expr:
    def __eq__(self, other):
        return self
    def where(self, *args):
        return self


portfolio_ns = {"Artwork": NS(visibility_status=Expr()),
                "VisibilityStatus": NS(PUBLIC="PUBLIC"), "select": lambda *_: Expr()}
portfolio = extract("backend/api/routers/portfolio.py", "get_portfolio", portfolio_ns)
try:
    portfolio(None, 0, None, "ILLUSTRATION", None, None)
except NameError as exc:
    assert exc.name == "WorkType"
    print(f"REPRODUCED filtered portfolio API failure: {exc}")
else:
    raise AssertionError("Expected WorkType NameError")

auth_ns = {"HTTPException": HTTPException, "status": status}
auth = extract("backend/core/auth.py", "get_current_user", auth_ns)
admin = extract("backend/core/auth.py", "get_admin_user", auth_ns)
print("REPRODUCED mandatory catalog auth:", expect_http(lambda: auth(None, None), 401))
print("REPRODUCED artist watermark authorization:", expect_http(lambda: admin(artist), 403))

file_ns = dict(ns, DBFile=object(), os=os, re=re, is_order_fully_paid=lambda *_: False)
extract("backend/api/routers/orders.py", "sanitize_filename", file_ns)
download = extract("backend/api/routers/orders.py", "download_order_file", file_ns)
reference = NS(id=9, order_id=1, filename="ref_Probe", s3_key="probe.png", file_type="REFERENCE")
order = NS(id=1, client_id=30, artist_id=20)
session = NS(get=lambda cls, _: order if cls is file_ns["Order"] else reference)
original_cwd = os.getcwd()
with tempfile.TemporaryDirectory(prefix="dice-ui-audit-") as temp_dir:
    try:
        os.chdir(temp_dir)
        Path("uploads/references").mkdir(parents=True)
        Path("uploads/references/probe.png").write_bytes(b"reference-probe")
        detail = expect_http(lambda: download(1, 9, session, artist), 404)
        print(f"REPRODUCED accepted reference download: HTTP 404 ({detail}); reference exists in uploads/references")
    finally:
        os.chdir(original_cwd)

print("All isolated audit probes completed. No application database was opened.")
