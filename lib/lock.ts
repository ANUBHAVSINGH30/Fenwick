import redis from "./redis";

export async function acquireSeatLock(
    seatId: string,
    lockToken: string,
): Promise<boolean> {
    const key = `lock:seat:${seatId}`;

    const result = await redis.set(
        key,
        lockToken,
        "EX",
        10,
        "NX"
    );

    return result == "OK";
};

export async function releaseSeatLock(
    seatId: string,
    lockToken: string,
): Promise<boolean> {
    const key = `lock:seat:${seatId}`;

    const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
    else
        return 0
    end`;
    
    const result = await redis.eval(
        script,
        1,
        key,
        lockToken
    );

    return result == 1;

}