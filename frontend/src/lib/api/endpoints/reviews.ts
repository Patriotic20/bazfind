import { apiFetch } from "../client";
import type { Review } from "../types";

/**
 * Reviews are tied to a booking, not to a venue.
 *
 * `POST /v1/reviews` requires a `booking_id`, and the backend refuses a second
 * review for the same one. So a review is not something anyone can leave about
 * anywhere — it is something a guest who actually came can say once. The screen
 * has to find an eligible booking before it can offer the form at all.
 */

export interface ReviewInput {
  booking_id: number;
  rating: number;
  comment?: string | null;
}

export function createReview(input: ReviewInput): Promise<Review> {
  return apiFetch<Review>("/v1/reviews", {
    method: "POST",
    auth: "required",
    body: input,
  });
}
