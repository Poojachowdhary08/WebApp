import React, { useState } from "react";
import GanttChart from "./GanttChart";
import TaskManagerCombined from "./TaskManager";

const ScheduleDashboard = ({ schedule, propertyId }) => {
  const [selectedTask, setSelectedTask] = useState(null);

  return (
    <div>
      {!selectedTask ? (
        <GanttChart schedule={schedule} onTaskSelect={setSelectedTask} />
      ) : (
        <TaskManagerCombined propertyId={propertyId} initialTask={selectedTask} />
      )}
    </div>
  );
};

export default ScheduleDashboard;
