"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  owner_user_id: string | null;
  parent_location_id: string | null;
  name: string;
  location_type: string;
  public_description: string;
  chronicler_notes: string;
  factions: string;
  npcs: string;
  quests: string;
  resources: string;
  visibility: "chronicler" | "players";
};

const locationTypes = [
  "Continent",
  "Region",
  "Kingdom / Nation",
  "Province",
  "City",
  "Town",
  "Village",
  "District",
  "Landmark",
  "Wilderness",
  "Dungeon",
  "Shop",
  "Building",
  "Point of Interest",
];

export function ChroniclerWorldAtlasPage() {
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [continentId, setContinentId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedAutoSave = useRef(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedId) || null,
    [locations, selectedId],
  );
  const continents = useMemo(
    () => locations.filter((location) => location.location_type === "Continent" && !location.parent_location_id),
    [locations],
  );
  const regions = useMemo(
    () => locations.filter((location) => location.parent_location_id === continentId),
    [continentId, locations],
  );
  const places = useMemo(
    () => locations.filter((location) => location.parent_location_id === regionId),
    [locations, regionId],
  );
  const nestedLocations = useMemo(
    () => locations.filter((location) => location.parent_location_id === placeId),
    [locations, placeId],
  );

  const loadLocations = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("world_locations").select("*").order("name", { ascending: true });

    if (error) {
      setMessage(
        error.message.includes("world_locations")
          ? "Run supabase/migrations/011_add_world_locations.sql in Supabase SQL Editor."
          : error.message,
      );
      setIsLoading(false);
      return;
    }

    setLocations((data || []) as WorldLocation[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Atlas records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (!selectedLocation) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving location...");

      const { error } = await supabase
        .from("world_locations")
        .update({
          parent_location_id: selectedLocation.parent_location_id,
          name: selectedLocation.name.trim() || "Unnamed Location",
          location_type: selectedLocation.location_type,
          public_description: selectedLocation.public_description,
          chronicler_notes: selectedLocation.chronicler_notes,
          factions: selectedLocation.factions,
          npcs: selectedLocation.npcs,
          quests: selectedLocation.quests,
          resources: selectedLocation.resources,
          visibility: selectedLocation.visibility,
        })
        .eq("id", selectedLocation.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Location saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [selectedLocation]);

  async function createLocation(locationType: string, parentLocationId: string | null) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("world_locations")
      .insert({
        owner_user_id: user?.id,
        parent_location_id: parentLocationId,
        name: `New ${locationType}`,
        location_type: locationType,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const savedLocation = data as WorldLocation;
    setLocations((current) => [...current, savedLocation].sort((left, right) => left.name.localeCompare(right.name)));
    selectLocation(savedLocation);
    setMessage(`${locationType} created.`);
  }

  function selectLocation(location: WorldLocation | null) {
    hasLoadedAutoSave.current = false;

    if (!location) {
      setSelectedId("");
      return;
    }

    const path = getLocationPath(location, locations);
    setContinentId(path[0]?.id || "");
    setRegionId(path[1]?.id || "");
    setPlaceId(path[2]?.id || "");
    setSelectedId(location.id);
  }

  function updateSelectedLocation(nextLocation: WorldLocation) {
    setLocations((current) => current.map((location) => (location.id === nextLocation.id ? nextLocation : location)));
  }

  function chooseContinent(nextContinentId: string) {
    hasLoadedAutoSave.current = false;
    setContinentId(nextContinentId);
    setRegionId("");
    setPlaceId("");
    setSelectedId(nextContinentId);
  }

  function chooseRegion(nextRegionId: string) {
    hasLoadedAutoSave.current = false;
    setRegionId(nextRegionId);
    setPlaceId("");
    setSelectedId(nextRegionId);
  }

  function choosePlace(nextPlaceId: string) {
    hasLoadedAutoSave.current = false;
    setPlaceId(nextPlaceId);
    setSelectedId(nextPlaceId);
  }

  return (
    <div className="atlas-workspace">
      {message ? <p className="form-message atlas-message">{message}</p> : null}

      <section className="atlas-browser-panel">
        <div className="list-header">
          <h3>Atlas Browser</h3>
          <span className="tag teal">{isLoading ? "Loading" : `${locations.length} records`}</span>
        </div>

        <div className="atlas-filter-grid">
          <label>
            <span>Continent</span>
            <select value={continentId} onChange={(event) => chooseContinent(event.target.value)}>
              <option value="">Choose Continent</option>
              {continents.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Region</span>
            <select value={regionId} onChange={(event) => chooseRegion(event.target.value)} disabled={!continentId}>
              <option value="">Choose Region</option>
              {regions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>City / Town / Place</span>
            <select value={placeId} onChange={(event) => choosePlace(event.target.value)} disabled={!regionId}>
              <option value="">Choose Place</option>
              {places.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Specific Location</span>
            <select value={selectedId} onChange={(event) => selectLocation(locations.find((location) => location.id === event.target.value) || null)} disabled={!placeId}>
              <option value={placeId || ""}>{placeId ? "Use selected place" : "Choose Location"}</option>
              {nestedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="atlas-actions">
          <button className="primary-inline-button" onClick={() => createLocation("Continent", null)}>
            New Continent
          </button>
          <button className="secondary-button" onClick={() => createLocation("Region", continentId || null)} disabled={!continentId}>
            New Region
          </button>
          <button className="secondary-button" onClick={() => createLocation("City", regionId || null)} disabled={!regionId}>
            New Place
          </button>
          <button className="secondary-button" onClick={() => createLocation("Point of Interest", placeId || selectedId || null)} disabled={!selectedId}>
            New Detail
          </button>
        </div>
      </section>

      <section className="atlas-layout">
        <aside className="atlas-tree-panel">
          <div className="list-header">
            <h3>Current Branch</h3>
            <span className="tag gold">Nested</span>
          </div>
          <div className="atlas-tree-list">
            {getVisibleBranch(locations, continentId, regionId, placeId).map((location) => (
              <button
                className={`atlas-tree-item ${location.id === selectedId ? "active" : ""}`}
                key={location.id}
                onClick={() => selectLocation(location)}
              >
                <strong>{location.name}</strong>
                <span>{location.location_type}</span>
              </button>
            ))}
            {!continentId ? (
              <div className="empty-state">
                <strong>No branch selected.</strong>
                <span>Create or choose a continent to begin browsing.</span>
              </div>
            ) : null}
          </div>
        </aside>

        {selectedLocation ? (
          <LocationEditor
            location={selectedLocation}
            locations={locations}
            onChange={updateSelectedLocation}
          />
        ) : (
          <section className="detail-panel atlas-editor-panel">
            <h3>Select a Location</h3>
            <p className="subcopy">Choose a place from the Atlas browser or create a new continent to start building the world.</p>
          </section>
        )}
      </section>
    </div>
  );
}

function LocationEditor({
  location,
  locations,
  onChange,
}: {
  location: WorldLocation;
  locations: WorldLocation[];
  onChange: (location: WorldLocation) => void;
}) {
  return (
    <section className="detail-panel atlas-editor-panel">
      <div className="list-header">
        <h3>Location Details</h3>
        <span className="tag teal">Autosaves</span>
      </div>

      <div className="atlas-editor-grid">
        <label className="field">
          <span>Name</span>
          <input value={location.name} onChange={(event) => onChange({ ...location, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Type</span>
          <select value={location.location_type} onChange={(event) => onChange({ ...location, location_type: event.target.value })}>
            {locationTypes.map((locationType) => (
              <option key={locationType} value={locationType}>
                {locationType}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Parent Location</span>
          <select value={location.parent_location_id || ""} onChange={(event) => onChange({ ...location, parent_location_id: event.target.value || null })}>
            <option value="">No Parent</option>
            {locations
              .filter((parentLocation) => parentLocation.id !== location.id)
              .map((parentLocation) => (
                <option key={parentLocation.id} value={parentLocation.id}>
                  {parentLocation.name} ({parentLocation.location_type})
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Visibility</span>
          <select value={location.visibility} onChange={(event) => onChange({ ...location, visibility: event.target.value as WorldLocation["visibility"] })}>
            <option value="chronicler">Chronicler Only</option>
            <option value="players">Player Visible Later</option>
          </select>
        </label>
      </div>

      <div className="atlas-notes-grid">
        <label className="field">
          <span>Public Description</span>
          <textarea value={location.public_description} onChange={(event) => onChange({ ...location, public_description: event.target.value })} />
        </label>
        <label className="field">
          <span>Chronicler Private Notes</span>
          <textarea value={location.chronicler_notes} onChange={(event) => onChange({ ...location, chronicler_notes: event.target.value })} />
        </label>
      </div>

      <div className="atlas-editor-grid">
        <label className="field">
          <span>Important NPCs</span>
          <textarea value={location.npcs} onChange={(event) => onChange({ ...location, npcs: event.target.value })} />
        </label>
        <label className="field">
          <span>Factions</span>
          <textarea value={location.factions} onChange={(event) => onChange({ ...location, factions: event.target.value })} />
        </label>
        <label className="field">
          <span>Quests</span>
          <textarea value={location.quests} onChange={(event) => onChange({ ...location, quests: event.target.value })} />
        </label>
        <label className="field">
          <span>Resources / Shops / Notes</span>
          <textarea value={location.resources} onChange={(event) => onChange({ ...location, resources: event.target.value })} />
        </label>
      </div>
    </section>
  );
}

function getLocationPath(location: WorldLocation, locations: WorldLocation[]) {
  const path: WorldLocation[] = [];
  let currentLocation: WorldLocation | undefined = location;

  while (currentLocation) {
    path.unshift(currentLocation);
    currentLocation = locations.find((candidate) => candidate.id === currentLocation?.parent_location_id);
  }

  return path;
}

function getVisibleBranch(locations: WorldLocation[], continentId: string, regionId: string, placeId: string) {
  const branchIds = [continentId, regionId, placeId].filter(Boolean);
  const branchLocations = branchIds
    .map((locationId) => locations.find((location) => location.id === locationId))
    .filter((location): location is WorldLocation => Boolean(location));
  const childParentId = placeId || regionId || continentId;
  const childLocations = childParentId ? locations.filter((location) => location.parent_location_id === childParentId) : [];

  return [...branchLocations, ...childLocations.filter((location) => !branchIds.includes(location.id))];
}
