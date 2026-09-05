export function assertProject(value) {
    if (!value || typeof value !== "object")
        throw new Error("Project is not an object.");
    const project = value;
    if (project.schemaVersion !== 1)
        throw new Error("Unsupported project version.");
    if (!project.rig || !Array.isArray(project.rig.bones))
        throw new Error("Project rig is missing.");
    if (!project.stage || typeof project.stage.width !== "number")
        throw new Error("Project stage is missing.");
}
