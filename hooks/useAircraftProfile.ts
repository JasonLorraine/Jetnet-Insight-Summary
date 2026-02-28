import { useQuery } from "@tanstack/react-query";
import type {
  AircraftProfile,
  CondensedAircraftProfile,
  AircraftPicture,
  IntelResponse,
} from "@/shared/types";

export type LoadingPhase = "not-started" | "loading" | "loaded" | "error";

export interface AircraftProfileData {
  profile: AircraftProfile | undefined;
  condensed: CondensedAircraftProfile | undefined;
  relationships: IntelResponse | undefined;
  pictures: AircraftPicture[] | undefined;

  phase1Status: LoadingPhase;
  phase2Status: LoadingPhase;
  phase3Status: LoadingPhase;

  isPhase1Loading: boolean;
  isPhase2Loading: boolean;
  isPhase3Loading: boolean;

  refetchPhase1: () => void;
  refetchPhase2: () => void;
}

interface EnrichResponse {
  phase: number;
  condensed: CondensedAircraftProfile;
  relationships: IntelResponse;
  pictures: AircraftPicture[];
}

export function useAircraftProfile(registration: string | undefined) {
  const phase1 = useQuery<AircraftProfile>({
    queryKey: ["/api/aircraft", registration, "profile"],
    enabled: !!registration,
  });

  const acid = phase1.data?.aircraftId;

  const phase2 = useQuery<EnrichResponse>({
    queryKey: ["/api/aircraft/enrich", acid?.toString()],
    enabled: !!acid && acid > 0,
  });

  const phase3 = useQuery<IntelResponse>({
    queryKey: ["/api/intel/relationships", registration],
    enabled: !!registration && !!phase1.data,
  });

  const getStatus = (
    isLoading: boolean,
    isError: boolean,
    data: unknown,
    enabled: boolean
  ): LoadingPhase => {
    if (!enabled) return "not-started";
    if (isLoading) return "loading";
    if (isError) return "error";
    if (data !== undefined) return "loaded";
    return "not-started";
  };

  const phase1Status = getStatus(
    phase1.isLoading,
    phase1.isError,
    phase1.data,
    !!registration
  );
  const phase2Status = getStatus(
    phase2.isLoading,
    phase2.isError,
    phase2.data,
    !!acid && acid > 0
  );
  const phase3Status = getStatus(
    phase3.isLoading,
    phase3.isError,
    phase3.data,
    !!registration && !!phase1.data
  );

  return {
    profile: phase1.data,
    condensed: phase2.data?.condensed,
    relationships: phase3.data ?? phase2.data?.relationships,
    pictures: (phase2.data?.pictures?.length ? phase2.data.pictures : null) ?? phase1.data?.pictures,

    phase1Status,
    phase2Status,
    phase3Status,

    isPhase1Loading: phase1.isLoading,
    isPhase2Loading: phase2.isLoading,
    isPhase3Loading: phase3.isLoading,

    refetchPhase1: phase1.refetch,
    refetchPhase2: phase2.refetch,
  } satisfies AircraftProfileData;
}
