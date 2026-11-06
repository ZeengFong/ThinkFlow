"""Projects, flows and the node ↔ task sync."""


def node(node_id, label, priority="medium", x=0, y=0):
    return {"id": node_id, "type": "thinkflow", "position": {"x": x, "y": y},
            "data": {"label": label, "priority": priority}}


def test_new_project_has_a_flow_with_master_node(client):
    project = client.post("/api/projects/", json={"title": "Essay", "deadline": "2026-12-01T17:00:00Z"}).json()
    assert project["deadline"] == "2026-12-01T17:00:00Z"
    flow = client.get(f"/api/flows/{project['flow_id']}").json()
    assert [n["type"] for n in flow["nodes"]] == ["master"]
    assert flow["nodes"][0]["data"]["label"] == "Essay"


def test_nodes_and_tasks_stay_in_sync(client):
    project = client.post("/api/projects/", json={"title": "Lab report"}).json()
    flow_id = project["flow_id"]
    master = client.get(f"/api/flows/{flow_id}").json()["nodes"][0]

    # Adding nodes creates tasks.
    client.put(f"/api/flows/{flow_id}", json={
        "nodes": [master, node("a", "Collect data", "high"), node("b", "Write methods")],
        "edges": [{"id": "e1", "source": "master-node", "target": "a"}, {"id": "e2", "source": "a", "target": "b"}],
    })
    tasks = {t["node_id"]: t for t in client.get("/api/tasks/", params={"project_id": project["id"]}).json()}
    assert tasks["a"]["title"] == "Collect data" and tasks["a"]["priority"] == "high"
    assert tasks["b"]["title"] == "Write methods"

    # Status / due date live on the task and survive flow saves.
    client.patch(f"/api/tasks/{tasks['a']['id']}", json={"status": "done", "due_date": "2026-11-10T18:00:00-07:00"})

    # Renaming a node renames its task; deleting a node deletes its task (and its edges).
    flow = client.put(f"/api/flows/{flow_id}", json={
        "nodes": [master, node("a", "Collect lab data", "high")],
        "edges": [{"id": "e1", "source": "master-node", "target": "a"}, {"id": "e2", "source": "a", "target": "b"}],
    }).json()
    assert [e["target"] for e in flow["edges"]] == ["a"]
    tasks = client.get("/api/tasks/", params={"project_id": project["id"]}).json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Collect lab data"
    assert tasks[0]["status"] == "done"
    assert tasks[0]["due_date"] == "2026-11-11T01:00:00Z"

    project = client.get(f"/api/projects/{project['id']}").json()
    assert (project["task_count"], project["tasks_done"], project["progress"], project["status"]) == (1, 1, 100, "completed")


def test_master_node_is_always_kept_and_follows_the_title(client):
    project = client.post("/api/projects/", json={"title": "Old title"}).json()
    flow = client.put(f"/api/flows/{project['flow_id']}", json={"nodes": [node("a", "Step")], "edges": []}).json()
    assert flow["nodes"][0]["type"] == "master"
    client.patch(f"/api/projects/{project['id']}", json={"title": "New title"})
    flow = client.get(f"/api/flows/{project['flow_id']}").json()
    assert flow["nodes"][0]["data"]["label"] == "New title"


def test_deleting_a_task_removes_its_node(client):
    project = client.post("/api/projects/", json={"title": "P"}).json()
    client.put(f"/api/flows/{project['flow_id']}", json={"nodes": [node("a", "Step A")], "edges": []})
    task = client.get("/api/tasks/").json()[0]
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 200
    flow = client.get(f"/api/flows/{project['flow_id']}").json()
    assert [n["id"] for n in flow["nodes"]] == ["master-node"]


def test_clearing_a_due_date(client):
    project = client.post("/api/projects/", json={"title": "P"}).json()
    task = client.post("/api/tasks/", json={"project_id": project["id"], "title": "T",
                                            "due_date": "2026-11-10T12:00:00Z"}).json()
    assert task["due_date"] == "2026-11-10T12:00:00Z"
    assert client.patch(f"/api/tasks/{task['id']}", json={"due_date": None}).json()["due_date"] is None


def test_junk_node_data_is_cleaned(client):
    project = client.post("/api/projects/", json={"title": "P"}).json()
    flow = client.put(f"/api/flows/{project['flow_id']}", json={"nodes": [
        {"id": "a", "type": "evil", "position": {"x": "nope"}, "data": {"label": "", "priority": "urgent", "onClick": "x"}},
        {"id": "a", "type": "thinkflow", "data": {"label": "duplicate id"}},
    ], "edges": [{"source": "a", "target": "missing"}]}).json()
    step = next(n for n in flow["nodes"] if n["id"] == "a")
    assert step == {"id": "a", "type": "thinkflow", "position": {"x": 0.0, "y": 0.0},
                    "data": {"label": "Untitled step", "priority": "medium"}}
    assert flow["edges"] == []


def test_tasks_whose_node_was_never_saved_are_kept_and_shown(client):
    """Regression: a task whose node never reached the saved flow (e.g. made by an older
    version of the app) must not be deleted by the next flow save."""
    project = client.post("/api/projects/", json={"title": "P"}).json()
    ghost = client.post("/api/tasks/", json={"project_id": project["id"], "title": "built frontend",
                                             "node_id": "node-never-saved", "priority": "high"}).json()
    loose = client.post("/api/tasks/", json={"project_id": project["id"], "title": "no node at all"}).json()

    # A client that never saw those nodes saves the flow: both tasks survive.
    client.put(f"/api/flows/{project['flow_id']}", json={"nodes": [node("a", "Step A")], "edges": []})
    titles = {t["title"] for t in client.get("/api/tasks/").json()}
    assert {"built frontend", "no node at all", "Step A"} <= titles

    # Loading the flow gives every task a node under the project.
    flow = client.get(f"/api/flows/{project['flow_id']}").json()
    labels = {n["data"]["label"]: n for n in flow["nodes"]}
    assert labels["built frontend"]["id"] == "node-never-saved"
    assert labels["built frontend"]["data"]["priority"] == "high"
    assert "no node at all" in labels
    assert {e["target"] for e in flow["edges"] if e["source"] == "master-node"} >= {"node-never-saved"}
    loose_now = client.get(f"/api/tasks/{loose['id']}").json()
    assert loose_now["node_id"] and loose_now["node_id"] in {n["id"] for n in flow["nodes"]}
    assert client.get(f"/api/tasks/{ghost['id']}").status_code == 200

    # Once the node is on the canvas, deleting it does delete the task.
    remaining = [n for n in flow["nodes"] if n["id"] != "node-never-saved"]
    client.put(f"/api/flows/{project['flow_id']}", json={"nodes": remaining, "edges": flow["edges"]})
    assert client.get(f"/api/tasks/{ghost['id']}").status_code == 404
