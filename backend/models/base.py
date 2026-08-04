from enum import Enum

class VisibilityStatus(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    CLIENT_ONLY = "CLIENT_ONLY"
    LINK_ONLY = "LINK_ONLY"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    SKETCHING = "SKETCHING"
    COLORING = "COLORING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class AuctionType(str, Enum):
    COMMISSION_SLOT = "COMMISSION_SLOT"
    ADOPTABLE = "ADOPTABLE"

class AuctionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"

class WorkType(str, Enum):
    COMMISSION = "COMMISSION"
    FANART = "FANART"
    VTUBER_MODEL = "VTUBER_MODEL"
    ILLUSTRATION = "ILLUSTRATION"
    SKETCH = "SKETCH"
    COMIC = "COMIC"
    LIVE2D = "LIVE2D"
    CONCEPT_ART = "CONCEPT_ART"
