"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetVideosDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class GetVideosDto {
    sort = 'hype';
    limit;
    lang = 'es';
}
exports.GetVideosDto = GetVideosDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort results by hype score or publication date',
        enum: ['hype', 'date'],
        default: 'hype',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['hype', 'date']),
    __metadata("design:type", String)
], GetVideosDto.prototype, "sort", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum number of videos to return (1-50)',
        minimum: 1,
        maximum: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], GetVideosDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Language for relative dates and messages',
        enum: ['es', 'en'],
        default: 'es',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['es', 'en']),
    __metadata("design:type", String)
], GetVideosDto.prototype, "lang", void 0);
//# sourceMappingURL=get-videos.dto.js.map