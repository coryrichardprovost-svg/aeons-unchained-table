"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
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

type AtlasNpc = {
  id: string;
  name: string;
  location_id: string | null;
  faction: string;
  organization: string;
};

type AtlasMarket = {
  id: string;
  name: string;
  location_id: string | null;
  market_type: string;
};

const locationTypes = ["Continent", "Region", "City", "Town", "Village", "District", "Landmark", "Wilderness", "Dungeon", "Building", "Point of Interest"];

export function ChroniclerWorldAtlasPage() {
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [npcs, setNpcs] = useState<AtlasNpc[]>([]);
  const [markets, setMarkets] = useState<AtlasMarket[]>([]);
  const [continentId, setContinentId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isBackendOpen, setIsBackendOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorldLocation | null>(null);
  const [newChildType, setNewChildType] = useState("");
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
    () => locations.filter((location) => location.parent_location_id === continentId && getAllowedChildTypes("Continent").includes(location.location_type)),
    [continentId, locations],
  );
  const places = useMemo(
    () => locations.filter((location) => location.parent_location_id === regionId && getAllowedChildTypes("Region").includes(location.location_type)),
    [locations, regionId],
  );
  const specificLocations = useMemo(
    () => {
      const parentLocation = locations.find((location) => location.id === placeId);
      return locations.filter(
        (location) => location.parent_location_id === placeId && getAllowedChildTypes(parentLocation?.location_type).includes(location.location_type),
      );
    },
    [locations, placeId],
  );
  const allowedNewChildTypes = useMemo(
    () => (selectedLocation ? getAllowedChildTypes(selectedLocation.location_type) : ["Continent"]),
    [selectedLocation],
  );

  const loadLocations = useCallback(async () => {
    const supabase = createClient();
    const [{ data: locationData, error: locationError }, { data: npcData, error: npcError }, { data: marketData, error: marketError }] = await Promise.all([
      supabase.from("world_locations").select("*").order("name", { ascending: true }),
      supabase.from("npcs").select("id,name,location_id,faction,organization").order("name", { ascending: true }),
      supabase.from("markets").select("id,name,location_id,market_type").order("name", { ascending: true }),
    ]);

    if (locationError) {
      setMessage(
        locationError.message.includes("world_locations")
          ? "Run supabase/migrations/011_add_world_locations.sql in Supabase SQL Editor."
          : locationError.message,
      );
      setIsLoading(false);
      return;
    }

    if (npcError) {
      setMessage(npcError.message.includes("npcs") ? "Run supabase/migrations/012_add_npcs.sql in Supabase SQL Editor." : npcError.message);
    }

    if (marketError) {
      setMessage(marketError.message.includes("markets") ? "Run supabase/migrations/014_add_markets.sql in Supabase SQL Editor." : marketError.message);
    }

    setLocations((locationData || []) as WorldLocation[]);
    setNpcs((npcData || []) as AtlasNpc[]);
    setMarkets((marketData || []) as AtlasMarket[]);
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
    const parentLocation = parentLocationId ? locations.find((location) => location.id === parentLocationId) : null;
    const allowedTypes = getAllowedChildTypes(parentLocation?.location_type);

    if (parentLocationId && !allowedTypes.includes(locationType)) {
      setMessage(`${locationType} cannot be created inside ${parentLocation?.location_type || "that area"}.`);
      return;
    }

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

  function createSelectedChildLocation() {
    if (!selectedLocation || !newChildType) return;
    void createLocation(newChildType, selectedLocation.id);
  }

  async function deleteLocationBranch(location: WorldLocation) {
    const branchIds = getLocationBranchIds(location.id, locations);
    const supabase = createClient();
    setMessage(`Deleting ${branchIds.length} area${branchIds.length === 1 ? "" : "s"}...`);

    const { error } = await supabase.from("world_locations").delete().in("id", branchIds);

    if (error) {
      setMessage(error.message);
      return;
    }

    const remainingLocations = locations.filter((candidate) => !branchIds.includes(candidate.id));
    setLocations(remainingLocations);
    setDeleteTarget(null);

    const fallbackLocation = getDeleteFallbackLocation(location, remainingLocations);
    selectLocation(fallbackLocation);
    setMessage("Area deleted.");
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

          <AtlasSelect
            label="Continent"
            value={continentId}
            disabled={false}
            locations={continents}
            onChange={chooseContinent}
            onCurrentClick={() => setSelectedId(continentId)}
          />
          <AtlasSelect
            label="Region"
            value={regionId}
            disabled={!continentId}
            locations={regions}
            onChange={chooseRegion}
            onCurrentClick={() => setSelectedId(regionId || continentId)}
          />
          <AtlasSelect
            label="City, Town, or Place"
            value={placeId}
            disabled={!regionId}
            locations={places}
            onChange={choosePlace}
            onCurrentClick={() => setSelectedId(placeId || regionId || continentId)}
          />
          <AtlasSelect
            label="Specific Location"
            value={specificLocations.some((location) => location.id === selectedId) ? selectedId : ""}
            disabled={!placeId}
            locations={specificLocations}
            placeholder={placeId ? "Use selected place" : "Choose Location"}
            fallbackValue=""
            onChange={chooseSpecificLocation}
            onCurrentClick={() => setSelectedId(selectedId || placeId || regionId || continentId)}
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
          <AtlasAreaSummary location={selectedLocation} locations={locations} npcs={npcs} markets={markets} onSelect={selectLocation} />
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
            <label className="atlas-create-type">
              <span>New Child Type</span>
              <select
                value={newChildType}
                onChange={(event) => setNewChildType(event.target.value)}
                disabled={!selectedLocation || allowedNewChildTypes.length === 0}
              >
                <option value="">Choose Type</option>
                {allowedNewChildTypes.map((locationType) => (
                  <option key={locationType} value={locationType}>
                    {locationType}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" onClick={createSelectedChildLocation} disabled={!selectedLocation || !newChildType}>
              New Area Under Selected
            </button>
          </div>

          {selectedLocation ? (
            <LocationEditor
              location={selectedLocation}
              locations={locations}
              onChange={updateSelectedLocation}
              onRequestDelete={() => setDeleteTarget(selectedLocation)}
              deleteCount={getLocationBranchIds(selectedLocation.id, locations).length}
            />
          ) : (
            <div className="empty-state">
              <strong>No area selected.</strong>
              <span>Create or choose an area before editing.</span>
            </div>
          )}
        </section>
      ) : null}

      {deleteTarget ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-location-title">
          <section className="confirm-dialog">
            <p className="eyebrow">World Atlas</p>
            <h3 id="delete-location-title">Delete this area?</h3>
            <p className="subcopy">
              This will delete {deleteTarget.name} and {getLocationBranchIds(deleteTarget.id, locations).length - 1} area
              {getLocationBranchIds(deleteTarget.id, locations).length - 1 === 1 ? "" : "s"} inside it.
            </p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="primary-inline-button" onClick={() => deleteLocationBranch(deleteTarget)}>
                Delete Area
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AtlasAreaSummary({
  location,
  locations,
  npcs,
  markets,
  onSelect,
}: {
  location: WorldLocation;
  locations: WorldLocation[];
  npcs: AtlasNpc[];
  markets: AtlasMarket[];
  onSelect: (location: WorldLocation) => void;
}) {
  const childLocations = getChildLocations(location.id, locations);
  const groupedChildLocations = groupLocationsByType(childLocations);
  const specialLocationCount = getSpecialLocationCount(location.id, locations);
  const locationNpcs = npcs.filter((npc) => npc.location_id === location.id);
  const locationMarkets = markets.filter((market) => market.location_id === location.id);

  return (
    <div className="atlas-area-summary">
      <section className="atlas-summary-block">
        <div className="list-header">
          <h3>Areas Within {location.name}</h3>
          <span className="tag teal">{childLocations.length}</span>
        </div>
        <div className="atlas-child-type-stack">
          {groupedChildLocations.map(([locationType, typeLocations]) => (
            <div className="atlas-child-type-group" key={locationType}>
              <div className="atlas-child-type-heading">
                <strong>{locationType}</strong>
                <span>{typeLocations.length}</span>
              </div>
              <div className="atlas-child-grid">
                {typeLocations.map((childLocation) => (
                  <button className="atlas-child-card" key={childLocation.id} onClick={() => onSelect(childLocation)}>
                    <strong>{childLocation.name}</strong>
                    <span>{childLocation.location_type}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {childLocations.length === 0 ? (
            <div className="empty-state">
              <strong>No nested areas yet.</strong>
              <span>
                {canHaveChildren(location) ? "Open the backend to add areas inside this location." : "This area type does not have nested areas."}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="atlas-summary-block">
        <div className="list-header">
          <h3>Special Locations</h3>
          <span className="tag gold">{specialLocationCount}</span>
        </div>
        <p className="subcopy">
          {specialLocationCount
            ? `${location.name} has ${specialLocationCount} special location${specialLocationCount === 1 ? "" : "s"} nested inside it.`
            : "No special locations have been added under this area yet."}
        </p>
      </section>

      <section className="atlas-summary-block">
        <div className="list-header">
          <h3>NPCs In This Area</h3>
          <span className="tag teal">{locationNpcs.length}</span>
        </div>
        <div className="atlas-npc-list">
          {locationNpcs.map((npc) => (
            <Link href={`/dm/npcs/${npc.id}`} className="atlas-npc-chip" key={npc.id}>
              <strong>{npc.name}</strong>
              <span>{npc.faction || npc.organization || "No group set"}</span>
            </Link>
          ))}
          {locationNpcs.length === 0 ? <p className="subcopy">No NPCs are connected to this area yet.</p> : null}
        </div>
      </section>

      <section className="atlas-summary-block">
        <div className="list-header">
          <h3>Markets In This Area</h3>
          <span className="tag gold">{locationMarkets.length}</span>
        </div>
        <div className="atlas-npc-list">
          {locationMarkets.map((market) => (
            <Link href={`/dm/market/${market.id}`} className="atlas-npc-chip" key={market.id}>
              <strong>{market.name}</strong>
              <span>{market.market_type || "Market"}</span>
            </Link>
          ))}
          {locationMarkets.length === 0 ? <p className="subcopy">No markets are connected to this area yet.</p> : null}
        </div>
      </section>

      <section className="atlas-summary-block">
        <div className="list-header">
          <h3>Description</h3>
          <span className="tag">{location.location_type}</span>
        </div>
        <p className="subcopy">{location.public_description || "No description has been written yet."}</p>
      </section>
    </div>
  );
}

function AtlasSelect({
  label,
  value,
  locations,
  disabled,
  onChange,
  onCurrentClick,
  placeholder = "Choose",
  fallbackValue = "",
}: {
  label: string;
  value: string;
  locations: WorldLocation[];
  disabled: boolean;
  onChange: (locationId: string) => void;
  onCurrentClick: () => void;
  placeholder?: string;
  fallbackValue?: string;
}) {
  function handleMouseDown(event: MouseEvent<HTMLSelectElement>) {
    if (!value || disabled) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const clickedArrowZone = event.clientX >= bounds.right - 42;

    if (!clickedArrowZone) {
      event.preventDefault();
      onCurrentClick();
    }
  }

  return (
    <label className="atlas-rail-select">
      <span>{label}</span>
      <select value={value} onMouseDown={handleMouseDown} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
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
  onRequestDelete,
  deleteCount,
}: {
  location: WorldLocation;
  locations: WorldLocation[];
  onChange: (location: WorldLocation) => void;
  onRequestDelete: () => void;
  deleteCount: number;
}) {
  const allowedTypes = getAllowedLocationTypesForEditor(location, locations);
  const allowedParentLocations = locations.filter((parentLocation) => parentLocation.id !== location.id && getAllowedChildTypes(parentLocation.location_type).includes(location.location_type));

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
            {allowedTypes.map((locationType) => (
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
            {allowedParentLocations.map((parentLocation) => (
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
      <div className="atlas-danger-zone">
        <div>
          <strong>Delete Area</strong>
          <span>
            Removes this area and {deleteCount - 1} nested area{deleteCount - 1 === 1 ? "" : "s"} below it.
          </span>
        </div>
        <button className="secondary-button" onClick={onRequestDelete}>
          Delete
        </button>
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

function getLocationBranchIds(locationId: string, locations: WorldLocation[]) {
  const branchIds = new Set([locationId]);
  let addedChild = true;

  while (addedChild) {
    addedChild = false;
    for (const location of locations) {
      if (location.parent_location_id && branchIds.has(location.parent_location_id) && !branchIds.has(location.id)) {
        branchIds.add(location.id);
        addedChild = true;
      }
    }
  }

  return Array.from(branchIds);
}

function getChildLocations(locationId: string, locations: WorldLocation[]) {
  const parentLocation = locations.find((location) => location.id === locationId);
  const allowedTypes = getAllowedChildTypes(parentLocation?.location_type);
  return locations.filter((location) => location.parent_location_id === locationId && allowedTypes.includes(location.location_type));
}

function getSpecialLocationCount(locationId: string, locations: WorldLocation[]) {
  const branchIds = getLocationBranchIds(locationId, locations);
  return locations.filter((location) => location.id !== locationId && branchIds.includes(location.id) && isSpecialLocation(location)).length;
}

function isSpecialLocation(location: WorldLocation) {
  return ["Point of Interest", "Dungeon", "Landmark", "Building"].includes(location.location_type);
}

function groupLocationsByType(locations: WorldLocation[]) {
  const groups = new Map<string, WorldLocation[]>();

  for (const location of locations) {
    groups.set(location.location_type, [...(groups.get(location.location_type) || []), location]);
  }

  return Array.from(groups.entries()).sort(([leftType], [rightType]) => locationTypes.indexOf(leftType) - locationTypes.indexOf(rightType));
}

function getAllowedChildTypes(parentType?: string) {
  if (!parentType) return ["Continent"];

  if (parentType === "Continent") return ["Region"];
  if (parentType === "Region") return ["City", "Town", "Village", "Landmark", "Wilderness", "Dungeon", "Building", "Point of Interest"];
  if (["City", "Town", "Village"].includes(parentType)) return ["District", "Building", "Point of Interest", "Dungeon", "Landmark"];
  if (parentType === "District") return ["Building", "Point of Interest", "Landmark"];
  if (parentType === "Wilderness") return ["Dungeon", "Landmark", "Point of Interest"];

  return [];
}

function getAllowedLocationTypesForEditor(location: WorldLocation, locations: WorldLocation[]) {
  if (!location.parent_location_id) return ["Continent"];

  const parentLocation = locations.find((candidate) => candidate.id === location.parent_location_id);
  const allowedTypes = getAllowedChildTypes(parentLocation?.location_type);
  return allowedTypes.includes(location.location_type) ? allowedTypes : [location.location_type, ...allowedTypes];
}

function canHaveChildren(location: WorldLocation) {
  return getAllowedChildTypes(location.location_type).length > 0;
}

function getDeleteFallbackLocation(deletedLocation: WorldLocation, remainingLocations: WorldLocation[]) {
  if (deletedLocation.parent_location_id) {
    return remainingLocations.find((location) => location.id === deletedLocation.parent_location_id) || null;
  }

  return remainingLocations.find((location) => location.location_type === "Continent" && !location.parent_location_id) || null;
}
