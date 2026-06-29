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

const locationTypes = ["Continent", "Region", "City", "Town", "Village", "District", "Landmark", "Wilderness", "Dungeon", "Building", "Point of Interest"];

export function ChroniclerWorldAtlasPage() {
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [continentId, setContinentId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isBackendOpen, setIsBackendOpen] = useState(false);
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
  const specificLocations = useMemo(
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
    if (!selectedLocation || !isBackendOpen) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving area...");

      const { error } = await supabase
        .from("world_locations")
        .update({
          parent_location_id: selectedLocation.parent_location_id,
          name: selectedLocation.name.trim() || "Unnamed Area",
          location_type: selectedLocation.location_type,
          public_description: selectedLocation.public_description,
          chronicler_notes: selectedLocation.chronicler_notes,
          visibility: selectedLocation.visibility,
        })
        .eq("id", selectedLocation.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Area saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [isBackendOpen, selectedLocation]);

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
    setIsBackendOpen(true);
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
    setSelectedId(nextRegionId || continentId);
  }

  function choosePlace(nextPlaceId: string) {
    hasLoadedAutoSave.current = false;
    setPlaceId(nextPlaceId);
    setSelectedId(nextPlaceId || regionId || continentId);
  }

  function chooseSpecificLocation(nextLocationId: string) {
    if (!nextLocationId) {
      hasLoadedAutoSave.current = false;
      setSelectedId(placeId || regionId || continentId);
      return;
    }

    selectLocation(locations.find((location) => location.id === nextLocationId) || null);
  }

  function updateSelectedLocation(nextLocation: WorldLocation) {
    setLocations((current) => current.map((location) => (location.id === nextLocation.id ? nextLocation : location)));
  }

  return (
    <div className="atlas-dashboard">
      {message ? <p className="form-message atlas-message">{message}</p> : null}

      <section className="atlas-hero-panel">
        <div className="atlas-map-frame">
          <div className="atlas-map-overlay">
            <span className="eyebrow">World Atlas</span>
            <h3>{selectedLocation?.name || "Choose an Area"}</h3>
            <p>{selectedLocation?.location_type || "Nate's world map and area art will live here."}</p>
          </div>
        </div>

        <aside className="atlas-selector-rail">
          <div className="list-header">
            <h3>Browse</h3>
            <button className="secondary-button compact-action" onClick={() => setIsBackendOpen((current) => !current)}>
              {isBackendOpen ? "Close Backend" : "Open Backend"}
            </button>
          </div>

          <AtlasSelect label="Continent" value={continentId} disabled={false} locations={continents} onChange={chooseContinent} />
          <AtlasSelect label="Region" value={regionId} disabled={!continentId} locations={regions} onChange={chooseRegion} />
          <AtlasSelect label="City, Town, or Place" value={placeId} disabled={!regionId} locations={places} onChange={choosePlace} />
          <AtlasSelect
            label="Specific Location"
            value={selectedId}
            disabled={!placeId}
            locations={specificLocations}
            placeholder={placeId ? "Use selected place" : "Choose Location"}
            fallbackValue=""
            onChange={chooseSpecificLocation}
          />

          <span className="tag teal">{isLoading ? "Loading" : `${locations.length} saved areas`}</span>
        </aside>
      </section>

      <section className="atlas-info-panel">
        <div className="list-header">
          <h3>{selectedLocation?.name || "Area Information"}</h3>
          <span className="tag gold">{selectedLocation?.location_type || "No area selected"}</span>
        </div>
        {selectedLocation ? (
          <div className="atlas-info-grid">
            <div>
              <strong>Area Info</strong>
              <p className="subcopy">{selectedLocation.chronicler_notes || "No area information has been written yet."}</p>
            </div>
            <div>
              <strong>Description</strong>
              <p className="subcopy">{selectedLocation.public_description || "No description has been written yet."}</p>
            </div>
          </div>
        ) : (
          <p className="subcopy">Choose a continent, region, place, or specific location to view its information.</p>
        )}
      </section>

      {isBackendOpen ? (
        <section className="atlas-backend-panel">
          <div className="list-header">
            <h3>Atlas Backend</h3>
            <span className="tag teal">Autosaves selected area</span>
          </div>

          <div className="atlas-actions">
            <button className="primary-inline-button" onClick={() => createLocation("Continent", null)}>
              New Continent
            </button>
            <button className="secondary-button" onClick={() => createLocation("Region", continentId || null)} disabled={!continentId}>
              New Region
            </button>
            <button className="secondary-button" onClick={() => createLocation("City", regionId || null)} disabled={!regionId}>
              New City / Town / Place
            </button>
            <button className="secondary-button" onClick={() => createLocation("Point of Interest", placeId || selectedId || null)} disabled={!selectedId}>
              New Specific Location
            </button>
          </div>

          {selectedLocation ? (
            <LocationEditor location={selectedLocation} locations={locations} onChange={updateSelectedLocation} />
          ) : (
            <div className="empty-state">
              <strong>No area selected.</strong>
              <span>Create or choose an area before editing.</span>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function AtlasSelect({
  label,
  value,
  locations,
  disabled,
  onChange,
  placeholder = "Choose",
  fallbackValue = "",
}: {
  label: string;
  value: string;
  locations: WorldLocation[];
  disabled: boolean;
  onChange: (locationId: string) => void;
  placeholder?: string;
  fallbackValue?: string;
}) {
  return (
    <label className="atlas-rail-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value={fallbackValue}>{placeholder}</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </label>
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
    <div className="atlas-editor-simple">
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
          <span>Parent Area</span>
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
          <span>Area Info</span>
          <textarea value={location.chronicler_notes} onChange={(event) => onChange({ ...location, chronicler_notes: event.target.value })} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={location.public_description} onChange={(event) => onChange({ ...location, public_description: event.target.value })} />
        </label>
      </div>
    </div>
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
