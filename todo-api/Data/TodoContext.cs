using Microsoft.EntityFrameworkCore;
using todo_api.Models;

namespace todo_api.Data;

public class TodoContext(DbContextOptions<TodoContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
}