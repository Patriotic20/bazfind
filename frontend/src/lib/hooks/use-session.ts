"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { authKeys, getMe, getMyGroup, logout as logoutRequest } from "@/lib/api/endpoints/auth";
import { hasSession, subscribeToSession } from "@/lib/api/auth-tokens";
import { ApiError } from "@/lib/api/types";

/**
 * Who is signed in, according to the server.
 *
 * The prototype answered this from five localStorage keys, one of which held
 * every account's password in plain text, and broadcast changes through a
 * hand-rolled `window` event. Both are gone: the session is a query, and
 * "changed" means invalidated.
 *
 * Being a partner is not a stored flag either — it is owning a chain, which is
 * a question only the server can answer.
 */
export function useSession() {
  const queryClient = useQueryClient();

  // `hasSession` reads a module variable and localStorage, so React needs to be
  // told when it moves; the store notifies on sign-in and sign-out alike.
  const signedIn = useSyncExternalStore(
    subscribeToSession,
    () => hasSession(),
    () => false, // the server has no session
  );

  const userQuery = useQuery({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    enabled: signedIn,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const groupQuery = useQuery({
    queryKey: authKeys.myGroup(),
    queryFn: ({ signal }) => getMyGroup(signal),
    enabled: signedIn && userQuery.isSuccess,
    // A customer has no chain. That 404 is an answer, not a failure to retry.
    retry: false,
    staleTime: 5 * 60_000,
  });

  const notAPartner =
    groupQuery.isError && groupQuery.error instanceof ApiError && groupQuery.error.status === 404;

  return {
    signedIn,
    user: userQuery.data ?? null,
    group: groupQuery.data ?? null,
    isPartner: groupQuery.isSuccess,
    /** True until we know both who this is and whether they own a chain. */
    isLoading:
      signedIn && (userQuery.isPending || (userQuery.isSuccess && groupQuery.isPending)),
    isResolved: !signedIn || userQuery.isError || groupQuery.isSuccess || notAPartner,
    async signOut() {
      await logoutRequest();
      queryClient.clear();
    },
  };
}
