from evalkit.scoring import aggregate_grades


def test_aggregate_scoring_reports_core_control_and_module_breakdowns():
    rows = [
        {"task_id": "T1", "score": 1.0, "passed": True},
        {"task_id": "C1", "score": 0.5, "passed": False},
    ]
    tasks = {
        "T1": {"module": "M1", "control": False},
        "C1": {"module": "M1", "control": True},
    }
    result = aggregate_grades(rows, tasks, seed=7)
    assert result["attempts"] == 2
    assert result["scopes"]["core"]["pass_at_1"] == 1.0
    assert result["scopes"]["control"]["mean_score"] == 0.5
    assert result["modules"]["M1"]["bootstrap_95"]["seed"] == 7
