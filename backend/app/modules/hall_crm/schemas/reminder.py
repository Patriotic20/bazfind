from pydantic import BaseModel, Field


class HallReminderDismiss(BaseModel):
    """Yashiriladigan eslatma kaliti."""

    key: str = Field(min_length=1, max_length=200)
