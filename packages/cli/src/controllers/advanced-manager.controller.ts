import { Logger } from '@n8n/backend-common';
import {
	UserRepository,
	SharedCredentialsRepository,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_OWNER_ROLE,
	AuthenticatedRequest,
} from '@n8n/db';
import {
	GlobalScope,
	Get,
	Post,
	RestController,
	Body,
	Param,
} from '@n8n/decorators';
import { Response } from 'express';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserService } from '@/services/user.service';

@RestController('/advanced-manager')
export class AdvancedManagerController {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
	) {}

	@Get('/users')
	@GlobalScope('user:list')
	async listUsers(req: AuthenticatedRequest, _res: Response) {
		const users = await this.userRepository.find({ relations: ['role'] });
		return users.map(user => ({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role.slug,
		}));
	}

	@Post('/users/:id/role')
	@GlobalScope('user:changeRole')
	async changeGlobalRole(req: AuthenticatedRequest, _res: Response, @Body payload: { newRoleName: string }, @Param('id') id: string) {
		const targetUser = await this.userRepository.findOne({
			where: { id },
			relations: ['role'],
		});
		if (!targetUser) {
			throw new NotFoundError('User not found');
		}

		if (req.user.role.slug !== GLOBAL_OWNER_ROLE.slug && payload.newRoleName === GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Only owner can assign owner role');
		}

		await this.userService.changeUserRole(targetUser, { newRoleName: payload.newRoleName });
		return { success: true };
	}

	@Post('/credentials/share')
	async shareCredentials(req: AuthenticatedRequest, _res: Response, @Body payload: { credentialId: string, userIds: string[] }) {
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug && req.user.role.slug !== GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Only admins and owners can share credentials freely');
		}

		const targetUsers = await this.userRepository.find({
			where: payload.userIds.map(id => ({ id })),
			relations: ['projectRelations', 'projectRelations.project', 'projectRelations.role']
		});

		const shares = targetUsers.map(user => {
			const personalProject = user.projectRelations?.find(pr => pr.role.slug === 'project:personalOwner');
			if (!personalProject) return null;
			return this.sharedCredentialsRepository.create({
				projectId: personalProject.projectId,
				credentialsId: payload.credentialId,
				role: 'credential:user'
			});
		}).filter(Boolean) as any[];

		if (shares.length > 0) {
			await this.sharedCredentialsRepository.save(shares);
		}

		return { success: true, sharedCount: shares.length };
	}
}
