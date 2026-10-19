import { apiFetch } from "../config";
import {
  UserRead,
  UserProfileUpdate,
  DeviceRead,
  DeviceCreate,
  UserListItem,
  FriendshipCreate,
  FriendshipRead,
  FriendshipRespond,
  UserAddressRead,
  UserAddressCreate,
} from "../types";

export const userService = {
  // Get current authenticated user profile
  async getMe(): Promise<UserRead> {
    return apiFetch<UserRead>("/api/v1/users/me");
  },

  // Update profile
  async updateMe(data: UserProfileUpdate): Promise<UserRead> {
    return apiFetch<UserRead>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Soft delete account
  async deleteMe(): Promise<void> {
    return apiFetch<void>("/api/v1/users/me", {
      method: "DELETE",
    });
  },

  // Devices
  async listDevices(): Promise<DeviceRead[]> {
    return apiFetch<DeviceRead[]>("/api/v1/users/me/devices");
  },

  async registerDevice(data: DeviceCreate): Promise<DeviceRead> {
    return apiFetch<DeviceRead>("/api/v1/users/me/devices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Friends & Social
  async listFriends(): Promise<UserListItem[]> {
    return apiFetch<UserListItem[]>("/api/v1/users/me/friends");
  },

  async requestFriend(addressee_id: number): Promise<FriendshipRead> {
    return apiFetch<FriendshipRead>("/api/v1/users/me/friends", {
      method: "POST",
      body: JSON.stringify({ addressee_id }),
    });
  },

  async listFriendRequests(): Promise<FriendshipRead[]> {
    return apiFetch<FriendshipRead[]>("/api/v1/users/me/friend-requests");
  },

  async respondFriendRequest(friendship_id: number, accept: boolean): Promise<FriendshipRead> {
    return apiFetch<FriendshipRead>(`/api/v1/users/me/friends/${friendship_id}/accept`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    });
  },

  // Recent Locations
  async listRecentLocations(): Promise<UserAddressRead[]> {
    return apiFetch<UserAddressRead[]>("/api/v1/users/me/recent-locations");
  },

  async saveRecentLocation(data: UserAddressCreate): Promise<UserAddressRead> {
    return apiFetch<UserAddressRead>("/api/v1/users/me/recent-locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
