"""Pieces shared by the `hall_crm` schemas."""

from typing import Annotated

from pydantic import Field

# A client-chosen id: letters, digits, `-` and `_`. The client mints it so a card
# keeps the id it was first shown under, before the server has answered.
Uid = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]

# A hall or session key from the settings document.
Key = Annotated[str, Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")]

# "HH:MM", the way the event-day timeline is typed.
ClockTime = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]
