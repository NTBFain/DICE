import re

with open('backend/api/routers/orders.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace import
code = code.replace('from core.auth import get_current_user, get_admin_user', 'from core.auth import get_current_user, get_admin_user, get_artist_user')

# For each endpoint using admin_user = Depends(get_admin_user)
# create_invoice
code = re.sub(
    r'def create_invoice\(order_id: int, request: MilestoneInvoiceCreateRequest, background_tasks: BackgroundTasks, session: Session = Depends\(get_session\), admin_user: User = Depends\(get_admin_user\)\):\s+order = session.get\(Order, order_id\)\s+if not order:\s+raise HTTPException\(status_code=404, detail="Order not found"\)',
    'def create_invoice(order_id: int, request: MilestoneInvoiceCreateRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):\n    order = session.get(Order, order_id)\n    if not order:\n        raise HTTPException(status_code=404, detail="Order not found")\n    if not artist_user.is_admin and order.artist_id != artist_user.id:\n        raise HTTPException(status_code=403, detail="Not authorized")',
    code
)

# approve_invoice_payment
code = re.sub(
    r'def approve_invoice_payment\(invoice_id: int, background_tasks: BackgroundTasks, session: Session = Depends\(get_session\), admin_user: User = Depends\(get_admin_user\)\):\s+invoice = session.get\(MilestoneInvoice, invoice_id\)\s+if not invoice:\s+raise HTTPException\(status_code=404, detail="Invoice not found"\)',
    'def approve_invoice_payment(invoice_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):\n    invoice = session.get(MilestoneInvoice, invoice_id)\n    if not invoice:\n        raise HTTPException(status_code=404, detail="Invoice not found")\n    order = session.get(Order, invoice.order_id)\n    if not artist_user.is_admin and order.artist_id != artist_user.id:\n        raise HTTPException(status_code=403, detail="Not authorized")',
    code
)

# resolve_revision
code = re.sub(
    r'def resolve_revision\(revision_id: int, session: Session = Depends\(get_session\), admin_user: User = Depends\(get_admin_user\)\):\s+revision = session.get\(Revision, revision_id\)\s+if not revision:\s+raise HTTPException\(status_code=404, detail="Revision not found"\)',
    'def resolve_revision(revision_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):\n    revision = session.get(Revision, revision_id)\n    if not revision:\n        raise HTTPException(status_code=404, detail="Revision not found")\n    order = session.get(Order, revision.order_id)\n    if not artist_user.is_admin and order.artist_id != artist_user.id:\n        raise HTTPException(status_code=403, detail="Not authorized")',
    code
)

# upload_order_file
code = re.sub(
    r'def upload_order_file\(order_id: int, background_tasks: BackgroundTasks, file_type: str = Form\(\.\.\.\), file: UploadFile = FormFile\(\.\.\.\), session: Session = Depends\(get_session\), admin_user: User = Depends\(get_admin_user\)\):\s+order = session.get\(Order, order_id\)\s+if not order:\s+raise HTTPException\(status_code=404, detail="Order not found"\)',
    'def upload_order_file(order_id: int, background_tasks: BackgroundTasks, file_type: str = Form(...), file: UploadFile = FormFile(...), session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):\n    order = session.get(Order, order_id)\n    if not order:\n        raise HTTPException(status_code=404, detail="Order not found")\n    if not artist_user.is_admin and order.artist_id != artist_user.id:\n        raise HTTPException(status_code=403, detail="Not authorized")',
    code
)

# delete_order_file
code = re.sub(
    r'def delete_order_file\(order_id: int, file_id: int, session: Session = Depends\(get_session\), admin_user: User = Depends\(get_admin_user\)\):\s+order = session.get\(Order, order_id\)\s+if not order:\s+raise HTTPException\(status_code=404, detail="Order not found"\)',
    'def delete_order_file(order_id: int, file_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):\n    order = session.get(Order, order_id)\n    if not order:\n        raise HTTPException(status_code=404, detail="Order not found")\n    if not artist_user.is_admin and order.artist_id != artist_user.id:\n        raise HTTPException(status_code=403, detail="Not authorized")',
    code
)

with open('backend/api/routers/orders.py', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
