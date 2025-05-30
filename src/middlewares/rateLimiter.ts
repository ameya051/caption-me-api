import { Request, Response, NextFunction } from 'express'
import IORedis from 'ioredis'
import ip from 'request-ip'


const io = new IORedis(process.env.REDIS_URL);

export async function rateLimiterByIp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const getIp = ip.getClientIp(req)
    // store id to redis
    await io.set(`redis-ip:${getIp}`, `${getIp}`)
    // get request by id
    const getStoreIp = await io.get(`redis-ip:${getIp}`)
    // counter count request
    const maxCounterRequest = await io.incrby(`counter-ip:${getIp}`, 1)

    if (getStoreIp === getIp && maxCounterRequest <= 10) {
        await io.expire(`counter-ip:${getIp}`, 10)
    } else {
        await io.del(`redis-ip:${getIp}`)
        res.status(429).json({
            status: 'ERROR TO MANY REQUEST',
            code: 'AX2AC5R',
            message: 'cannot access this endpoint, after 10 second is over'
        })
        return;
    }

    next()
}