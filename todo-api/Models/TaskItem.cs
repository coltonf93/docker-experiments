namespace todo_api.Models;

public class TaskItem
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool Completed { get; set; }
}