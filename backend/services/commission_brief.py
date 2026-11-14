"""Read-only order enrichment from the saved request, never the current service form."""
from models.commission import CommissionRequest

def get_commission_brief(order, session):
    if not order.commission_request_id:
        return None
    request = session.get(CommissionRequest, order.commission_request_id)
    # A corrupt link must not expose a different customer's brief.
    if not request or request.client_id != order.client_id or request.artist_user_id != order.artist_id:
        return None
    fields = ('character_name', 'usage_type', 'brief', 'canvas_size', 'requested_deadline',
              'reference_links', 'custom_responses', 'addons_snapshot', 'base_price_snapshot',
              'total_price', 'tos_snapshot', 'tos_version')
    return {'request_id': request.id, **{field: getattr(request, field) for field in fields}}
