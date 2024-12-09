using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using todo_api.Data;
using todo_api.Helpers;
using todo_api.Models;

namespace todo_api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController(TodoContext context, RedisCacheHelper cacheHelper) : ControllerBase
{
    private const string AllTasksKey = "all_tasks";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
    {
        var cachedTasks = await cacheHelper.GetCachedValueAsync<List<TaskItem>>(AllTasksKey);
        if (cachedTasks != null)
        {
            Response.Headers["X-Data-Source"] = "Cache";
            return cachedTasks;
        }

        var dbTasks = await context.Tasks.ToListAsync();
        await cacheHelper.SetCachedValueAsync(AllTasksKey, dbTasks);
        Response.Headers["X-Data-Source"] = "Database";
        return dbTasks;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskItem>> GetTaskItem(int id)
    {
        string taskKey = $"task_{id}";
        var cachedTask = await cacheHelper.GetCachedValueAsync<TaskItem>(taskKey);

        if (cachedTask != null)
        {
            Response.Headers["X-Data-Source"] = "Cache";
            return cachedTask;
        }

        var dbTask = await context.Tasks.FindAsync(id);
        if (dbTask == null) return NotFound();

        await cacheHelper.SetCachedValueAsync(taskKey, dbTask);
        Response.Headers["X-Data-Source"] = "Database";
        return dbTask;
    }

    [HttpPost]
    public async Task<ActionResult<TaskItem>> CreateTaskItem(TaskItem newTask)
    {
        if (string.IsNullOrWhiteSpace(newTask.Text))
            return BadRequest("Task text cannot be empty.");

        context.Tasks.Add(newTask);
        await context.SaveChangesAsync();

        // Invalidate all tasks cache since we have a new task
        await cacheHelper.InvalidateKeyAsync(AllTasksKey);

        // Cache the newly created task
        string taskKey = $"task_{newTask.Id}";
        await cacheHelper.SetCachedValueAsync(taskKey, newTask);

        return CreatedAtAction(nameof(GetTaskItem), new { id = newTask.Id }, newTask);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTaskItem(int id, TaskItem updatedTask)
    {
        var task = await context.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(updatedTask.Text))
            task.Text = updatedTask.Text;

        task.Completed = updatedTask.Completed;
        await context.SaveChangesAsync();

        await cacheHelper.InvalidateKeyAsync(AllTasksKey);

        string taskKey = $"task_{id}";
        await cacheHelper.SetCachedValueAsync(taskKey, task);

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTaskItem(int id)
    {
        var task = await context.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        context.Tasks.Remove(task);
        await context.SaveChangesAsync();

        await cacheHelper.InvalidateKeyAsync(AllTasksKey);

        string taskKey = $"task_{id}";
        await cacheHelper.InvalidateKeyAsync(taskKey);

        return NoContent();
    }
}
