import re

# CHARACTERS.PY
with open('backend/api/routers/characters.py', 'r', encoding='utf-8') as f:
    char_code = f.read()

# Add get_characters_admin
admin_get = """
@router.get("/admin", response_model=List[CharacterResponse])
def get_characters_admin(session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    if artist_user.is_admin:
        return session.exec(select(Character)).all()
    else:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if profile:
            return session.exec(select(Character).where(Character.artist_id == profile.id)).all()
        return []
"""
char_code = char_code.replace('@router.post("", response_model=CharacterResponse)', admin_get + '\n@router.post("", response_model=CharacterResponse)')

# Add permission check to update_character
update_check = """
    if not artist_user.is_admin:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or character.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this character")
"""
char_code = re.sub(
    r'character = session.get\(Character, character_id\)\s+if not character:\s+raise HTTPException\(status_code=404, detail="Character not found"\)',
    'character = session.get(Character, character_id)\n    if not character:\n        raise HTTPException(status_code=404, detail="Character not found")\n' + update_check,
    char_code
)

with open('backend/api/routers/characters.py', 'w', encoding='utf-8') as f:
    f.write(char_code)

# AUCTIONS.PY
with open('backend/api/routers/auctions.py', 'r', encoding='utf-8') as f:
    auc_code = f.read()

admin_get_auc = """
@router.get("/admin", response_model=List[AuctionResponse])
async def api_get_auctions_admin(background_tasks: BackgroundTasks, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    statement = select(Auction).options(
        selectinload(Auction.bids).joinedload(Bid.bidder),
        selectinload(Auction.winner)
    )
    if not artist_user.is_admin:
        from models import ArtistProfile
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if profile:
            statement = statement.where(Auction.artist_id == profile.id)
        else:
            statement = statement.where(Auction.artist_id == -1) # no profile = no auctions
            
    auctions = session.exec(statement).all()
    
    now = datetime.utcnow()
    for a in auctions:
        if a.status == AuctionStatus.ACTIVE and now >= a.end_time:
            background_tasks.add_task(background_close_auction, a.id)
            
    responses = []
    for a in auctions:
        sorted_bids = sorted(a.bids, key=lambda x: x.amount, reverse=True)
        bid_res = []
        for bid in sorted_bids:
            bidder_name = bid.bidder.full_name if bid.bidder else "Unknown Bidder"
            bid_res.append(BidResponse(
                id=bid.id,
                auction_id=bid.auction_id,
                bidder_id=bid.bidder_id,
                amount=bid.amount,
                created_at=bid.created_at.replace(tzinfo=timezone.utc),
                bidder_name=bidder_name
            ))
        responses.append(_build_auction_response(a, bid_res, session))
    return responses
"""
auc_code = auc_code.replace('@router.post("", response_model=AuctionResponse)', admin_get_auc + '\n@router.post("", response_model=AuctionResponse)')

# Add permission check to update_auction
update_check_auc = """
    if not artist_user.is_admin:
        from models import ArtistProfile
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or auction.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this auction")
"""
auc_code = re.sub(
    r'auction = session.get\(Auction, auction_id\)\s+if not auction:\s+raise HTTPException\(status_code=404, detail="Auction not found"\)',
    'auction = session.get(Auction, auction_id)\n    if not auction:\n        raise HTTPException(status_code=404, detail="Auction not found")\n' + update_check_auc,
    auc_code
)

with open('backend/api/routers/auctions.py', 'w', encoding='utf-8') as f:
    f.write(auc_code)

print("Done patching auctions and characters!")
