namespace todo_api.Helpers;

using System.Text.Json;
using StackExchange.Redis;

public class RedisCacheHelper(IConnectionMultiplexer redis)
{
    private readonly IDatabase _cache = redis.GetDatabase();
    private readonly TimeSpan _defaultTTL = TimeSpan.FromMinutes(5);

    public async Task<T?> GetCachedValueAsync<T>(string key)
    {
        var cachedValue = await _cache.StringGetAsync(key);
        return !cachedValue.HasValue ? default : JsonSerializer.Deserialize<T>(cachedValue);
    }

    public async Task SetCachedValueAsync<T>(string key, T value, TimeSpan? ttl = null)
    {
        var json = JsonSerializer.Serialize(value);
        await _cache.StringSetAsync(key, json, ttl ?? _defaultTTL);
    }

    public async Task InvalidateKeyAsync(string key)
    {
        await _cache.KeyDeleteAsync(key);
    }
}