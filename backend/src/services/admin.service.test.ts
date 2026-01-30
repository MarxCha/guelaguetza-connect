import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from './admin.service.js';
import type { PrismaClient, UserRole } from '@prisma/client';

// Create a mock Prisma client
const createMockPrisma = () => {
  return {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    story: {
      count: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
    like: {
      count: vi.fn(),
    },
    community: {
      count: vi.fn(),
    },
    event: {
      count: vi.fn(),
    },
    activityLog: {
      groupBy: vi.fn(),
    },
  } as unknown as PrismaClient;
};

describe('AdminService', () => {
  let adminService: AdminService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    adminService = new AdminService(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return all dashboard statistics', async () => {
      // Mock count methods
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1000); // totalUsers
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(500); // totalStories
      vi.mocked(mockPrisma.comment.count).mockResolvedValueOnce(2000); // totalComments
      vi.mocked(mockPrisma.like.count).mockResolvedValueOnce(5000); // totalLikes
      vi.mocked(mockPrisma.community.count).mockResolvedValueOnce(50); // totalCommunities
      vi.mocked(mockPrisma.event.count).mockResolvedValueOnce(30); // totalEvents
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(10); // newUsersToday
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(25); // newStoriesToday

      // Mock activityLog.groupBy
      const mockActivityGroups = [
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ];
      vi.mocked(mockPrisma.activityLog.groupBy).mockResolvedValueOnce(
        mockActivityGroups as any
      );

      const result = await adminService.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 1000,
        totalStories: 500,
        totalComments: 2000,
        totalLikes: 5000,
        totalCommunities: 50,
        totalEvents: 30,
        newUsersToday: 10,
        newStoriesToday: 25,
        activeUsersToday: 3,
      });

      // Verify activityLog.groupBy was called with correct params
      expect(mockPrisma.activityLog.groupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: { createdAt: { gte: expect.any(Date) } },
      });
    });

    it('should handle zero counts correctly', async () => {
      // Mock all counts as 0
      vi.mocked(mockPrisma.user.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.story.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.comment.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.like.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.community.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.activityLog.groupBy).mockResolvedValueOnce([] as any);

      const result = await adminService.getDashboardStats();

      expect(result.totalUsers).toBe(0);
      expect(result.activeUsersToday).toBe(0);
    });
  });

  describe('getUsers', () => {
    const mockUsers = [
      {
        id: 'user1',
        email: 'user1@example.com',
        nombre: 'Juan',
        apellido: 'Pérez',
        avatar: 'avatar1.jpg',
        role: 'USER' as UserRole,
        bannedAt: null,
        bannedReason: null,
        createdAt: new Date('2024-01-15'),
        _count: {
          stories: 5,
          followers: 10,
        },
      },
      {
        id: 'user2',
        email: 'user2@example.com',
        nombre: 'María',
        apellido: null,
        avatar: null,
        role: 'MODERATOR' as UserRole,
        bannedAt: new Date('2024-02-01'),
        bannedReason: 'Spam',
        createdAt: new Date('2024-01-10'),
        _count: {
          stories: 3,
          followers: 15,
        },
      },
    ];

    it('should return users with pagination', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce(mockUsers as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(2);

      const result = await adminService.getUsers(1, 20);

      expect(result.total).toBe(2);
      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toEqual({
        id: 'user1',
        email: 'user1@example.com',
        nombre: 'Juan',
        apellido: 'Pérez',
        avatar: 'avatar1.jpg',
        role: 'USER',
        bannedAt: null,
        bannedReason: null,
        createdAt: '2024-01-15T00:00:00.000Z',
        storiesCount: 5,
        followersCount: 10,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { stories: true, followers: true },
          },
        },
      });
    });

    it('should handle pagination correctly', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(100);

      await adminService.getUsers(3, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page 3 - 1) * 10
          take: 10,
        })
      );
    });

    it('should filter by search query', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([mockUsers[0]] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      await adminService.getUsers(1, 20, { search: 'Juan' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { nombre: { contains: 'Juan', mode: 'insensitive' } },
              { email: { contains: 'Juan', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should filter by role', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([mockUsers[1]] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      await adminService.getUsers(1, 20, { role: 'MODERATOR' as UserRole });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'MODERATOR' },
        })
      );
    });

    it('should filter banned users', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([mockUsers[1]] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      await adminService.getUsers(1, 20, { banned: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bannedAt: { not: null } },
        })
      );
    });

    it('should filter non-banned users', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([mockUsers[0]] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      await adminService.getUsers(1, 20, { banned: false });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bannedAt: null },
        })
      );
    });

    it('should combine multiple filters', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(0);

      await adminService.getUsers(1, 20, {
        search: 'test',
        role: 'ADMIN' as UserRole,
        banned: false,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { nombre: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
            role: 'ADMIN',
            bannedAt: null,
          },
        })
      );
    });

    it('should map _count fields correctly', async () => {
      const userWithCount = {
        ...mockUsers[0],
        _count: { stories: 100, followers: 250 },
      };
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([userWithCount] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      const result = await adminService.getUsers(1, 20);

      expect(result.users[0].storiesCount).toBe(100);
      expect(result.users[0].followersCount).toBe(250);
    });

    it('should handle bannedAt date conversion', async () => {
      const bannedUser = {
        ...mockUsers[1],
        bannedAt: new Date('2024-02-15T10:30:00.000Z'),
      };
      vi.mocked(mockPrisma.user.findMany).mockResolvedValueOnce([bannedUser] as any);
      vi.mocked(mockPrisma.user.count).mockResolvedValueOnce(1);

      const result = await adminService.getUsers(1, 20);

      expect(result.users[0].bannedAt).toBe('2024-02-15T10:30:00.000Z');
      expect(result.users[0].bannedReason).toBe('Spam');
    });
  });

  describe('changeUserRole', () => {
    it('should update user role', async () => {
      const mockUpdatedUser = {
        id: 'user1',
        role: 'ADMIN' as UserRole,
      };
      vi.mocked(mockPrisma.user.update).mockResolvedValueOnce(mockUpdatedUser as any);

      await adminService.changeUserRole('user1', 'ADMIN' as UserRole);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { role: 'ADMIN' },
      });
    });

    it('should handle role change to MODERATOR', async () => {
      vi.mocked(mockPrisma.user.update).mockResolvedValueOnce({} as any);

      await adminService.changeUserRole('user2', 'MODERATOR' as UserRole);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user2' },
        data: { role: 'MODERATOR' },
      });
    });
  });

  describe('banUser', () => {
    it('should ban user with reason', async () => {
      const mockBannedUser = {
        id: 'user1',
        bannedAt: new Date(),
        bannedReason: 'Violating community guidelines',
      };
      vi.mocked(mockPrisma.user.update).mockResolvedValueOnce(mockBannedUser as any);

      await adminService.banUser('user1', 'Violating community guidelines');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          bannedAt: expect.any(Date),
          bannedReason: 'Violating community guidelines',
        },
      });
    });

    it('should set bannedAt to current date', async () => {
      const beforeBan = new Date();
      vi.mocked(mockPrisma.user.update).mockResolvedValueOnce({} as any);

      await adminService.banUser('user1', 'Spam');

      const callArgs = vi.mocked(mockPrisma.user.update).mock.calls[0][0];
      const bannedAt = callArgs.data.bannedAt as Date;
      const afterBan = new Date();

      expect(bannedAt.getTime()).toBeGreaterThanOrEqual(beforeBan.getTime());
      expect(bannedAt.getTime()).toBeLessThanOrEqual(afterBan.getTime());
    });
  });

  describe('unbanUser', () => {
    it('should unban user by clearing ban fields', async () => {
      const mockUnbannedUser = {
        id: 'user1',
        bannedAt: null,
        bannedReason: null,
      };
      vi.mocked(mockPrisma.user.update).mockResolvedValueOnce(mockUnbannedUser as any);

      await adminService.unbanUser('user1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          bannedAt: null,
          bannedReason: null,
        },
      });
    });
  });

  describe('getContent', () => {
    const mockStories = [
      {
        id: 'story1',
        description: 'Test story 1',
        mediaUrl: 'https://example.com/image1.jpg',
        mediaType: 'image',
        createdAt: new Date('2024-01-20'),
        user: {
          id: 'user1',
          nombre: 'Juan',
        },
        _count: {
          likes: 10,
          comments: 5,
        },
      },
      {
        id: 'story2',
        description: 'Test story 2',
        mediaUrl: 'https://example.com/video1.mp4',
        mediaType: 'video',
        createdAt: new Date('2024-01-19'),
        user: {
          id: 'user2',
          nombre: 'María',
        },
        _count: {
          likes: 20,
          comments: 8,
        },
      },
    ];

    it('should return recent stories by default', async () => {
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce(mockStories as any);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(2);

      const result = await adminService.getContent(1, 20, 'recent');

      expect(result.total).toBe(2);
      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        id: 'story1',
        description: 'Test story 1',
        mediaUrl: 'https://example.com/image1.jpg',
        mediaType: 'image',
        authorId: 'user1',
        authorName: 'Juan',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2024-01-20T00:00:00.000Z',
      });

      // Verify recent filter (last 7 days)
      expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdAt: { gte: expect.any(Date) } },
        })
      );
    });

    it('should return all stories when type is "all"', async () => {
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce(mockStories as any);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(2);

      await adminService.getContent(1, 20, 'all');

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should handle pagination correctly', async () => {
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(50);

      await adminService.getContent(2, 15);

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 15, // (page 2 - 1) * 15
          take: 15,
        })
      );
    });

    it('should include user and count data', async () => {
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce(mockStories as any);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(2);

      await adminService.getContent(1, 20);

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nombre: true } },
            _count: { select: { likes: true, comments: true } },
          },
        })
      );
    });

    it('should order by createdAt descending', async () => {
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(0);

      await adminService.getContent(1, 20);

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should map _count fields correctly', async () => {
      const storyWithHighCounts = {
        ...mockStories[0],
        _count: { likes: 500, comments: 100 },
      };
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([storyWithHighCounts] as any);
      vi.mocked(mockPrisma.story.count).mockResolvedValueOnce(1);

      const result = await adminService.getContent(1, 20);

      expect(result.content[0].likesCount).toBe(500);
      expect(result.content[0].commentsCount).toBe(100);
    });
  });

  describe('deleteContent', () => {
    it('should delete story by id', async () => {
      vi.mocked(mockPrisma.story.delete).mockResolvedValueOnce({} as any);

      await adminService.deleteContent('story1');

      expect(mockPrisma.story.delete).toHaveBeenCalledWith({
        where: { id: 'story1' },
      });
    });

    it('should handle multiple delete calls', async () => {
      vi.mocked(mockPrisma.story.delete).mockResolvedValue({} as any);

      await adminService.deleteContent('story1');
      await adminService.deleteContent('story2');

      expect(mockPrisma.story.delete).toHaveBeenCalledTimes(2);
      expect(mockPrisma.story.delete).toHaveBeenNthCalledWith(1, {
        where: { id: 'story1' },
      });
      expect(mockPrisma.story.delete).toHaveBeenNthCalledWith(2, {
        where: { id: 'story2' },
      });
    });
  });

  describe('getReports', () => {
    it('should return user growth, story growth, and top creators', async () => {
      const mockUsersData = [
        { createdAt: new Date('2024-01-15T10:00:00.000Z') },
        { createdAt: new Date('2024-01-15T14:00:00.000Z') },
        { createdAt: new Date('2024-01-16T10:00:00.000Z') },
      ];

      const mockStoriesData = [
        { createdAt: new Date('2024-01-15T10:00:00.000Z') },
        { createdAt: new Date('2024-01-16T10:00:00.000Z') },
        { createdAt: new Date('2024-01-16T14:00:00.000Z') },
      ];

      const mockTopCreators = [
        {
          id: 'user1',
          nombre: 'Juan',
          _count: { stories: 50 },
        },
        {
          id: 'user2',
          nombre: 'María',
          _count: { stories: 30 },
        },
      ];

      // Mock findMany for users
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce(mockUsersData as any)
        .mockResolvedValueOnce(mockTopCreators as any);

      // Mock findMany for stories
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce(mockStoriesData as any);

      const result = await adminService.getReports(30);

      expect(result).toHaveProperty('userGrowth');
      expect(result).toHaveProperty('storyGrowth');
      expect(result).toHaveProperty('topCreators');

      expect(result.userGrowth).toBeInstanceOf(Array);
      expect(result.storyGrowth).toBeInstanceOf(Array);
      expect(result.topCreators).toBeInstanceOf(Array);

      expect(result.topCreators).toEqual([
        { id: 'user1', nombre: 'Juan', storiesCount: 50 },
        { id: 'user2', nombre: 'María', storiesCount: 30 },
      ]);
    });

    it('should group data by date correctly', async () => {
      // The service generates date keys from local-midnight dates via toISOString().split('T')[0]
      // and groups items by item.createdAt.toISOString().split('T')[0] (UTC date).
      // We need mock dates whose UTC date matches the service's generated keys.
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      // Compute two date keys the same way the service does
      const day6 = new Date(startDate);
      day6.setDate(day6.getDate() + 6);
      const day5 = new Date(startDate);
      day5.setDate(day5.getDate() + 5);

      const day6Key = day6.toISOString().split('T')[0];
      const day5Key = day5.toISOString().split('T')[0];

      // Create mock dates whose UTC date matches the keys
      const mockUsersData = [
        { createdAt: new Date(`${day6Key}T10:00:00.000Z`) },
        { createdAt: new Date(`${day6Key}T14:00:00.000Z`) },
        { createdAt: new Date(`${day5Key}T10:00:00.000Z`) },
      ];

      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce(mockUsersData as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      const result = await adminService.getReports(7);

      expect(result.userGrowth.length).toBe(7);

      const day6Entry = result.userGrowth.find(g => g.date === day6Key);
      const day5Entry = result.userGrowth.find(g => g.date === day5Key);

      expect(day6Entry?.count).toBe(2);
      expect(day5Entry?.count).toBe(1);
    });

    it('should handle custom date range', async () => {
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      const result = await adminService.getReports(14);

      expect(result.userGrowth.length).toBe(14);
      expect(result.storyGrowth.length).toBe(14);
    });

    it('should query users with correct date filter', async () => {
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      await adminService.getReports(30);

      // First call is for user growth
      expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(1, {
        where: { createdAt: { gte: expect.any(Date) } },
        select: { createdAt: true },
      });

      // Second call is for top creators
      expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(2, {
        orderBy: { stories: { _count: 'desc' } },
        take: 10,
        select: {
          id: true,
          nombre: true,
          _count: { select: { stories: true } },
        },
      });
    });

    it('should query stories with correct date filter', async () => {
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      await adminService.getReports(30);

      expect(mockPrisma.story.findMany).toHaveBeenCalledWith({
        where: { createdAt: { gte: expect.any(Date) } },
        select: { createdAt: true },
      });
    });

    it('should return top 10 creators ordered by story count', async () => {
      const mockCreators = Array.from({ length: 15 }, (_, i) => ({
        id: `user${i}`,
        nombre: `User ${i}`,
        _count: { stories: 100 - i },
      }));

      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce(mockCreators.slice(0, 10) as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      const result = await adminService.getReports(30);

      expect(result.topCreators).toHaveLength(10);
      expect(result.topCreators[0].storiesCount).toBe(100);
      expect(result.topCreators[9].storiesCount).toBe(91);
    });

    it('should initialize all days with zero counts', async () => {
      // No data for any days
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      const result = await adminService.getReports(5);

      expect(result.userGrowth.length).toBe(5);
      expect(result.storyGrowth.length).toBe(5);

      // All counts should be 0
      result.userGrowth.forEach(day => {
        expect(day.count).toBe(0);
      });
      result.storyGrowth.forEach(day => {
        expect(day.count).toBe(0);
      });
    });

    it('should handle dates with multiple records correctly', async () => {
      // Compute a date key matching the service's logic for getReports(3)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 3);
      startDate.setHours(0, 0, 0, 0);

      const day2 = new Date(startDate);
      day2.setDate(day2.getDate() + 2);
      const day2Key = day2.toISOString().split('T')[0];

      const mockUsersData = [
        { createdAt: new Date(`${day2Key}T08:00:00.000Z`) },
        { createdAt: new Date(`${day2Key}T12:00:00.000Z`) },
        { createdAt: new Date(`${day2Key}T18:00:00.000Z`) },
        { createdAt: new Date(`${day2Key}T22:00:00.000Z`) },
      ];

      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce(mockUsersData as any)
        .mockResolvedValueOnce([] as any);
      vi.mocked(mockPrisma.story.findMany).mockResolvedValueOnce([] as any);

      const result = await adminService.getReports(3);

      const day2Entry = result.userGrowth.find(g => g.date === day2Key);
      expect(day2Entry?.count).toBe(4);
    });
  });
});
