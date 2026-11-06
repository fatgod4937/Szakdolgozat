import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PetAdoptionStatus,
  Prisma,
  ProfileCommentTargetType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const profilePetSelect = {
  id: true,
  name: true,
  location: true,
  adoptionStatus: true,
  photoUrls: true,
} satisfies Prisma.PetSelect;

const commentAuthorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profilePictureUrl: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProfilesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserProfile(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        profilePictureUrl: true,
        bio: true,
        location: true,
        shelter: { select: { id: true, name: true } },
      },
    });

    if (!user || !user.id) {
      throw new NotFoundException('Profile not found.');
    }

    const [currentListings, previousPets] = await Promise.all([
      this.prismaService.pet.findMany({
        where: { ownerId: id, adoptionStatus: PetAdoptionStatus.AVAILABLE },
        select: profilePetSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.pet.findMany({
        where: { ownerId: id, adoptionStatus: PetAdoptionStatus.ADOPTED },
        select: profilePetSelect,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { ...user, currentListings, previousPets };
  }

  async getShelterProfile(id: string) {
    const shelter = await this.prismaService.shelter.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        city: true,
        contactEmail: true,
        websiteUrl: true,
        isVerified: true,
        donationIban: true,
        paypalDonationUrl: true,
        donationUrl: true,
        donationUrlLabel: true,
        owner: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            profilePictureUrl: true,
            bio: true,
            location: true,
          },
        },
      },
    });

    if (!shelter) {
      throw new NotFoundException('Shelter profile not found.');
    }

    const ownerId = shelter.owner?.id;
    const [currentListings, previousPets] = ownerId
      ? await Promise.all([
          this.prismaService.pet.findMany({
            where: {
              ownerId,
              adoptionStatus: PetAdoptionStatus.AVAILABLE,
            },
            select: profilePetSelect,
            orderBy: { createdAt: 'desc' },
          }),
          this.prismaService.pet.findMany({
            where: {
              ownerId,
              adoptionStatus: PetAdoptionStatus.ADOPTED,
            },
            select: profilePetSelect,
            orderBy: { updatedAt: 'desc' },
          }),
        ])
      : [[], []];

    return { ...shelter, currentListings, previousPets };
  }

  async listComments(targetType: string, targetId: string) {
    const validTargetType = this.parseTargetType(targetType);
    await this.assertTargetExists(validTargetType, targetId);

    return this.prismaService.profileComment.findMany({
      where: { targetType: validTargetType, targetId, parentId: null },
      select: {
        id: true,
        content: true,
        isRemoved: true,
        disputeStatus: true,
        createdAt: true,
        author: { select: commentAuthorSelect },
        replies: {
          where: { isRemoved: false },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: commentAuthorSelect },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createComment(
    targetType: string,
    targetId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ) {
    const validTargetType = this.parseTargetType(targetType);
    const normalizedContent = content?.trim();

    if (!normalizedContent || normalizedContent.length > 1000) {
      throw new BadRequestException(
        'Comment content must be between 1 and 1000 characters.',
      );
    }

    await this.assertTargetExists(validTargetType, targetId);

    if (parentId) {
      const parent = await this.prismaService.profileComment.findFirst({
        where: {
          id: parentId,
          targetType: validTargetType,
          targetId,
          parentId: null,
          isRemoved: false,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new BadRequestException(
          'Replies must reference an active top-level comment on this profile.',
        );
      }
    }

    return this.prismaService.profileComment.create({
      data: {
        targetType: validTargetType,
        targetId,
        authorId,
        parentId,
        content: normalizedContent,
      },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        author: { select: commentAuthorSelect },
      },
    });
  }

  async disputeComment(commentId: string, requesterId: string, reason: string) {
    const normalizedReason = reason?.trim();

    if (!normalizedReason || normalizedReason.length > 1000) {
      throw new BadRequestException(
        'A dispute reason between 1 and 1000 characters is required.',
      );
    }

    const comment = await this.prismaService.profileComment.findUnique({
      where: { id: commentId },
      select: { targetType: true, targetId: true, isRemoved: true },
    });

    if (!comment || comment.isRemoved) {
      throw new NotFoundException('Comment not found.');
    }

    const isOwner = await this.isProfileOwner(
      comment.targetType,
      comment.targetId,
      requesterId,
    );

    if (!isOwner) {
      throw new ForbiddenException('Only the profile owner can dispute comments.');
    }

    return this.prismaService.profileComment.update({
      where: { id: commentId },
      data: {
        disputeStatus: 'OPEN',
        disputeReason: normalizedReason,
        disputedAt: new Date(),
      },
      select: { id: true, disputeStatus: true, disputeReason: true },
    });
  }

  async removeComment(commentId: string, adminId: string) {
    const comment = await this.prismaService.profileComment.findUnique({
      where: { id: commentId },
      select: { id: true, isRemoved: true },
    });

    if (!comment || comment.isRemoved) {
      throw new NotFoundException('Active comment not found.');
    }

    return this.prismaService.profileComment.update({
      where: { id: commentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedById: adminId,
        disputeStatus: 'RESOLVED',
      },
      select: { id: true, isRemoved: true },
    });
  }

  listDisputedComments() {
    return this.prismaService.profileComment.findMany({
      where: { disputeStatus: 'OPEN', isRemoved: false },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        content: true,
        disputeReason: true,
        disputedAt: true,
        createdAt: true,
        author: { select: commentAuthorSelect },
      },
      orderBy: { disputedAt: 'asc' },
    });
  }

  private parseTargetType(targetType: string) {
    if (targetType === ProfileCommentTargetType.USER) {
      return ProfileCommentTargetType.USER;
    }
    if (targetType === ProfileCommentTargetType.SHELTER) {
      return ProfileCommentTargetType.SHELTER;
    }
    throw new BadRequestException('Profile type must be USER or SHELTER.');
  }

  private async assertTargetExists(
    targetType: ProfileCommentTargetType,
    targetId: string,
  ) {
    const exists =
      targetType === ProfileCommentTargetType.USER
        ? await this.prismaService.user.findUnique({
            where: { id: targetId },
            select: { id: true },
          })
        : await this.prismaService.shelter.findUnique({
            where: { id: targetId },
            select: { id: true },
          });

    if (!exists) {
      throw new NotFoundException('Profile not found.');
    }
  }

  private async isProfileOwner(
    targetType: ProfileCommentTargetType,
    targetId: string,
    requesterId: string,
  ) {
    if (targetType === ProfileCommentTargetType.USER) {
      return targetId === requesterId;
    }

    const shelter = await this.prismaService.shelter.findUnique({
      where: { id: targetId },
      select: { ownerId: true },
    });
    return shelter?.ownerId === requesterId;
  }
}
