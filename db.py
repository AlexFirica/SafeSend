history = {}


def get_history(employee_id):

    return history.get(employee_id, [])


def save_login(employee_id, data):

    if employee_id not in history:
        history[employee_id] = []

    history[employee_id].append(data)