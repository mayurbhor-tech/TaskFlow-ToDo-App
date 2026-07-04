from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# ──────────────────────────────────────────────
#  Model
# ──────────────────────────────────────────────
class Task(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), default='')
    completed   = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'title':       self.title,
            'description': self.description,
            'completed':   self.completed,
            'created_at':  self.created_at.strftime('%b %d, %Y'),
        }


# ──────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.order_by(Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/tasks', methods=['POST'])
def add_task():
    data  = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    task = Task(
        title       = title,
        description = (data.get('description') or '').strip(),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if 'title' in data:
        task.title = data['title'].strip() or task.title
    if 'description' in data:
        task.description = data['description'].strip()
    if 'completed' in data:
        task.completed = bool(data['completed'])

    db.session.commit()
    return jsonify(task.to_dict())


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})


# ──────────────────────────────────────────────
#  Entry point
# ──────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
